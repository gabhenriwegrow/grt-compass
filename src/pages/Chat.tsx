import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Markdown } from "@/components/Markdown";
import { CategoryBadge } from "@/components/CategoryBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { InitiativeStatus, STATUS_META, mondayOf } from "@/lib/grt";
import { Send, Check, X, Pencil, AlertTriangle, Loader2, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type ParsedUpdate = {
  initiative_id: string;
  initiative_title: string;
  initiative_number: number;
  initiative_category: string;
  match_confidence: number;
  progress: string | null;
  blockers: string | null;
  next_steps: string | null;
  status_change: string | null;
  new_status: InitiativeStatus;
  impediment_update: string | null;
  // local edit state
  _confirmed?: boolean;
  _rejected?: boolean;
  _editing?: boolean;
};

type AssistantPayload = {
  type: "update" | "query";
  updates: ParsedUpdate[];
  unmatched: string[];
  summary: string;
  response: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  payload?: AssistantPayload;
  saved?: boolean;
  savedTitles?: string[];
  error?: string;
  timestamp: Date;
};

type InitiativeLite = {
  id: string;
  title: string;
  category: string;
  status: InitiativeStatus;
  number: number;
  owner: string | null;
  impediment: string | null;
};

const PLACEHOLDERS = [
  "Ex: Retomada de leads: fizemos 20 contatos, 5 pediram proposta",
  "Ex: Playbook 80% pronto, falta validar com Isabela. Helper bloqueado, SI não liberou",
  "Ex: Sequências publicadas no HubSpot. Motor de preço: Jorge não respondeu",
  "Ex: 150 maiores: agendamos 4 reuniões. CALC concluído!",
];

const MAX_CHARS = 2000;

const BrandAvatar = () => (
  <div className="w-7 h-7 rounded-lg bg-[#0C2340] border-2 border-[#9B26B6] flex items-center justify-center text-white font-bold text-xs shrink-0">
    b
  </div>
);

const Chat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [initiatives, setInitiatives] = useState<InitiativeLite[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load initiatives once
  useEffect(() => {
    supabase
      .from("initiatives")
      .select("id, title, category, status, number, owner, impediment")
      .order("number")
      .then(({ data }) => setInitiatives((data ?? []) as InitiativeLite[]));
  }, []);

  // Rotate placeholders
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 168) + "px";
  }, [input]);

  const updateMessage = (id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const updateUpdateInMessage = (msgId: string, idx: number, patch: Partial<ParsedUpdate>) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.payload) return m;
        const updates = m.payload.updates.map((u, i) => (i === idx ? { ...u, ...patch } : u));
        return { ...m, payload: { ...m.payload, updates } };
      })
    );
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (text.length > MAX_CHARS) {
      toast.error(`Mensagem maior que ${MAX_CHARS} caracteres`);
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("parse-chat-update", {
        body: {
          message: text,
          initiatives: initiatives.map((i) => ({
            id: i.id,
            title: i.title,
            category: i.category,
            status: i.status,
            number: i.number,
            owner: i.owner,
            impediment: i.impediment,
          })),
        },
      });

      if (error) throw new Error(error.message || "Falha na chamada");
      if (data?.error) throw new Error(data.error);

      const payload = data as AssistantPayload;
      const updates = (payload.updates ?? []).map((u) => ({ ...u, _confirmed: true })) as ParsedUpdate[];

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        payload: { ...payload, updates },
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        error: e?.message ?? "Erro inesperado",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setSending(false);
    }
  };

  const retry = async (failedMsgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== failedMsgId));
    // re-send last user message
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      setInput(lastUser.content);
      setTimeout(() => send(), 50);
    }
  };

  const saveAll = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg?.payload) return;
    const toSave = msg.payload.updates.filter((u) => u._confirmed && !u._rejected);
    if (toSave.length === 0) {
      toast.error("Nenhuma atualização confirmada");
      return;
    }

    setSavingFor(msgId);
    const week_date = mondayOf(new Date());
    const savedTitles: string[] = [];

    try {
      for (const u of toSave) {
        const { error: ckErr } = await supabase.from("weekly_checkins").insert({
          initiative_id: u.initiative_id,
          week_date,
          status_snapshot: u.new_status,
          progress_delta: u.progress,
          blockers: u.blockers,
          next_steps: u.next_steps,
          author: "Gabriel",
        });
        if (ckErr) throw ckErr;

        const impedimentValue =
          u.impediment_update !== null && u.impediment_update !== undefined
            ? u.impediment_update
            : u.new_status !== "bloqueado"
            ? null
            : undefined;

        const { error: upErr } = await supabase
          .from("initiatives")
          .update({
            status: u.new_status,
            ...(impedimentValue !== undefined ? { impediment: impedimentValue } : {}),
          })
          .eq("id", u.initiative_id);
        if (upErr) throw upErr;

        savedTitles.push(u.initiative_title);
      }

      updateMessage(msgId, { saved: true, savedTitles });
      toast.success(`${savedTitles.length} check-in(s) salvos`);

      // Refresh local initiatives so next message has up-to-date status
      const { data } = await supabase
        .from("initiatives")
        .select("id, title, category, status, number, owner, impediment")
        .order("number");
      setInitiatives((data ?? []) as InitiativeLite[]);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message ?? "desconhecido"));
    } finally {
      setSavingFor(null);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  };

  const showWelcome = messages.length === 0 && !sending;

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 md:px-8 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#9B26B6]" />
            <h1 className="text-lg font-bold text-[#0C2340]">Atualização por chat</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Digite suas atualizações em texto livre. A IA identifica as iniciativas e estrutura os check-ins.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {showWelcome && <WelcomeCard />}

          {messages.map((m) => (
            <div key={m.id}>
              {m.role === "user" ? (
                <UserBubble message={m} />
              ) : (
                <AssistantBlock
                  message={m}
                  saving={savingFor === m.id}
                  onUpdateChange={(idx, patch) => updateUpdateInMessage(m.id, idx, patch)}
                  onSaveAll={() => saveAll(m.id)}
                  onRetry={() => retry(m.id)}
                />
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-start gap-2">
              <BrandAvatar />
              <div className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analisando suas atualizações
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "240ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 md:px-8 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={onKeyDown}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                disabled={sending}
                className="resize-none min-h-[44px] max-h-[168px] pr-14 text-sm"
                rows={1}
              />
              <span
                className={cn(
                  "absolute bottom-2 right-3 text-[10px] tabular-nums",
                  input.length > MAX_CHARS * 0.9 ? "text-[#B07D1A]" : "text-muted-foreground"
                )}
              >
                {input.length}/{MAX_CHARS}
              </span>
            </div>
            <Button
              onClick={send}
              disabled={sending || !input.trim()}
              size="icon"
              className="bg-[#9B26B6] hover:bg-[#8A22A3] text-white rounded-full h-11 w-11 shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 px-1">
            Dica: Ctrl+Enter para enviar. Você pode atualizar várias iniciativas de uma vez.
          </p>
        </div>
      </div>
    </div>
  );
};

const WelcomeCard = () => (
  <Card className="p-6 border border-border bg-card">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-[#9B26B6]/10 flex items-center justify-center shrink-0">
        <Sparkles className="w-5 h-5 text-[#9B26B6]" />
      </div>
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-[#0C2340]">Atualize suas iniciativas conversando</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Digite em texto livre o que avançou, o que está bloqueado e próximos passos. A IA identifica
            automaticamente as iniciativas e estrutura os check-ins para você confirmar.
          </p>
        </div>
        <div className="bg-[#F5F7FA] border border-border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
            Exemplo
          </div>
          <p className="text-sm text-[#0C2340] italic leading-relaxed">
            "Retomada: 15 contatos feitos, 3 reagendaram. Sequências: publicamos no HubSpot, testando com
            Elisvan. Motor de preço: bloqueado, Jorge não respondeu."
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Você também pode <span className="font-semibold">perguntar</span>: "o que está bloqueado?", "o que a
          Isabela tem?", "o que falta atualizar?"
        </p>
      </div>
    </div>
  </Card>
);

const UserBubble = ({ message }: { message: ChatMessage }) => (
  <div className="flex flex-col items-end">
    <div className="bg-[#0C2340] text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap">
      {message.content}
    </div>
    <span className="text-[10px] text-muted-foreground mt-1 mr-1 tabular-nums">
      {message.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  </div>
);

const AssistantBlock = ({
  message,
  saving,
  onUpdateChange,
  onSaveAll,
  onRetry,
}: {
  message: ChatMessage;
  saving: boolean;
  onUpdateChange: (idx: number, patch: Partial<ParsedUpdate>) => void;
  onSaveAll: () => void;
  onRetry: () => void;
}) => {
  if (message.error) {
    return (
      <div className="flex items-start gap-2">
        <BrandAvatar />
        <Card className="p-4 border border-[#C0392B]/30 bg-[#C0392B]/5 flex-1">
          <div className="flex items-center gap-2 text-sm text-[#C0392B] font-medium mb-2">
            <AlertTriangle className="w-4 h-4" /> Erro ao processar
          </div>
          <p className="text-xs text-muted-foreground mb-3">{message.error}</p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  const p = message.payload;
  if (!p) return null;

  // Query response
  if (p.type === "query" && p.response) {
    return (
      <div className="flex items-start gap-2">
        <BrandAvatar />
        <Card className="p-4 border border-border bg-card flex-1">
          <Markdown content={p.response} />
        </Card>
      </div>
    );
  }

  // Saved confirmation
  if (message.saved) {
    return (
      <div className="flex items-start gap-2">
        <BrandAvatar />
        <Card className="p-4 border border-[#2D7D46]/30 bg-[#2D7D46]/5 flex-1">
          <div className="flex items-center gap-2 text-sm text-[#2D7D46] font-semibold mb-2">
            <CheckCircle2 className="w-4 h-4" /> {message.savedTitles?.length} check-in(s) salvos com sucesso
          </div>
          <ul className="text-xs text-foreground/90 space-y-0.5 mb-3 ml-1">
            {message.savedTitles?.map((t, i) => (
              <li key={i}>• {t}</li>
            ))}
          </ul>
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-[#9B26B6] font-medium hover:underline">
            Ver no dashboard <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <BrandAvatar />
      <div className="flex-1 space-y-3">
        {p.summary && (
          <p className="text-xs text-muted-foreground italic">{p.summary}</p>
        )}

        {p.updates.map((u, idx) => (
          <UpdateCard key={idx} update={u} onChange={(patch) => onUpdateChange(idx, patch)} />
        ))}

        {p.unmatched.length > 0 && (
          <Card className="p-3 border border-[#B07D1A]/30 bg-[#B07D1A]/5">
            <div className="flex items-center gap-2 text-xs text-[#B07D1A] font-semibold mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Trechos não associados
            </div>
            <ul className="text-xs text-foreground/80 space-y-0.5 ml-1">
              {p.unmatched.map((t, i) => (
                <li key={i}>• {t}</li>
              ))}
            </ul>
          </Card>
        )}

        {p.updates.length > 0 && (
          <Card className="p-4 border border-border bg-card">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm font-semibold text-[#0C2340]">
                ✓ {p.updates.filter((u) => u._confirmed && !u._rejected).length} de {p.updates.length} atualizações confirmadas
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onSaveAll}
                  disabled={saving || p.updates.filter((u) => u._confirmed && !u._rejected).length === 0}
                  className="bg-[#9B26B6] hover:bg-[#8A22A3] text-white"
                  size="sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Salvando…
                    </>
                  ) : (
                    "Confirmar e salvar"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

const UpdateCard = ({
  update,
  onChange,
}: {
  update: ParsedUpdate;
  onChange: (patch: Partial<ParsedUpdate>) => void;
}) => {
  const confidence = update.match_confidence;
  const isUncertain = confidence < 70;
  const isRejected = update._rejected;
  const isConfirmed = update._confirmed && !update._rejected;
  const editing = update._editing;

  const newStatusMeta = STATUS_META[update.new_status] ?? STATUS_META.em_andamento;

  return (
    <Card
      className={cn(
        "p-4 border bg-card transition-all",
        isRejected && "opacity-50 bg-[#F5F7FA]",
        !isRejected && isConfirmed && !isUncertain && "border-[#2D7D46]/40",
        !isRejected && isUncertain && "border-[#B07D1A]/50"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {update.status_change ? (
            <span className="text-[10px] font-mono text-muted-foreground">{update.status_change}</span>
          ) : (
            <StatusBadge status={update.new_status} size="xs" />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editing && !isRejected && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onChange({ _editing: true })}
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={cn("h-7 w-7", isConfirmed && "text-[#2D7D46]")}
                onClick={() => onChange({ _confirmed: !isConfirmed, _rejected: false })}
                title="Correto"
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-[#C0392B]"
                onClick={() => onChange({ _rejected: true, _confirmed: false })}
                title="Errado"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {isRejected && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onChange({ _rejected: false, _confirmed: true })}>
              Restaurar
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <CategoryBadge category={update.initiative_category} />
        <span className="text-[10px] font-mono text-muted-foreground">#{update.initiative_number}</span>
      </div>
      <div className="text-sm font-semibold text-[#0C2340] mb-2">{update.initiative_title}</div>

      {!editing ? (
        <div className="space-y-1.5 text-xs">
          <FieldRow label="Progresso" value={update.progress} />
          <FieldRow label="Bloqueio" value={update.blockers} />
          <FieldRow label="Próximos" value={update.next_steps} />
          {update.impediment_update && (
            <FieldRow label="Impedimento" value={update.impediment_update} highlight />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <EditField
            label="Progresso"
            value={update.progress ?? ""}
            onChange={(v) => onChange({ progress: v || null })}
          />
          <EditField
            label="Bloqueios"
            value={update.blockers ?? ""}
            onChange={(v) => onChange({ blockers: v || null })}
          />
          <EditField
            label="Próximos passos"
            value={update.next_steps ?? ""}
            onChange={(v) => onChange({ next_steps: v || null })}
          />
          <EditField
            label="Impedimento (campo da iniciativa)"
            value={update.impediment_update ?? ""}
            onChange={(v) => onChange({ impediment_update: v || null })}
          />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Status
            </div>
            <Select value={update.new_status} onValueChange={(v) => onChange({ new_status: v as InitiativeStatus })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {STATUS_META[s].emoji} {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-1">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onChange({ _editing: false })}>
              Salvar edição
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          Confiança do match: <span className="font-mono font-semibold">{confidence}%</span>
        </span>
        {isUncertain && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#B07D1A]/10 text-[#B07D1A]">
            Match incerto — verifique
          </span>
        )}
        {!isUncertain && confidence < 90 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#0C2340]/10 text-[#0C2340]">
            Match provável
          </span>
        )}
      </div>
    </Card>
  );
};

const FieldRow = ({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) => (
  <div className="flex gap-2">
    <span className="text-muted-foreground font-medium w-20 shrink-0">{label}:</span>
    <span className={cn("flex-1 text-foreground/90", highlight && "text-[#C0392B] font-medium")}>
      {value ?? "—"}
    </span>
  </div>
);

const EditField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs min-h-[40px] resize-none"
      rows={2}
    />
  </div>
);

export default Chat;
