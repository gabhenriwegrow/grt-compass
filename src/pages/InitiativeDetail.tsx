import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, StatusIcon } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Markdown } from "@/components/Markdown";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { StatusSparkline } from "@/components/StatusSparkline";
import { InitiativeStatus, STATUS_META, formatDate, mondayOf, computeTrend, TREND_META } from "@/lib/grt";
import { ArrowLeft, AlertTriangle, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Initiative = any;
type Checkin = {
  id: string; week_date: string; status_snapshot: string; progress_delta: string | null;
  blockers: string | null; next_steps: string | null; notes: string | null; author: string;
  created_at: string;
};

const InitiativeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Initiative | null>(null);
  const [krCode, setKrCode] = useState<string | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [aiReport, setAiReport] = useState<{ id: string; content: string; generated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // inline-editable fields
  const [impedimentEdit, setImpedimentEdit] = useState("");
  const [currentValueEdit, setCurrentValueEdit] = useState("");

  // checkin form
  const [statusSnap, setStatusSnap] = useState<InitiativeStatus>("em_andamento");
  const [progress, setProgress] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [iRes, cRes, rRes] = await Promise.all([
      supabase.from("initiatives").select("*").eq("id", id!).maybeSingle(),
      supabase.from("weekly_checkins").select("*").eq("initiative_id", id!).order("week_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("ai_reports").select("id,content,generated_at").eq("report_type", "initiative_analysis").eq("scope", id!).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setData(iRes.data);
    setCheckins((cRes.data ?? []) as Checkin[]);
    setAiReport(rRes.data as any);
    if (iRes.data) {
      setStatusSnap(iRes.data.status as InitiativeStatus);
      setImpedimentEdit(iRes.data.impediment ?? "");
      setCurrentValueEdit(iRes.data.current_value != null ? String(iRes.data.current_value) : "");
      if (iRes.data.key_result_id) {
        const { data: kr } = await supabase.from("key_results").select("code").eq("id", iRes.data.key_result_id).maybeSingle();
        setKrCode(kr?.code ?? null);
      } else setKrCode(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const updateStatus = async (newStatus: InitiativeStatus) => {
    const { error } = await supabase.from("initiatives").update({ status: newStatus }).eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  };

  const saveImpediment = async () => {
    const { error } = await supabase.from("initiatives").update({ impediment: impedimentEdit || null }).eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Impedimento atualizado");
    load();
  };

  const saveCurrentValue = async () => {
    const v = parseFloat(currentValueEdit.replace(",", "."));
    const { error } = await supabase.from("initiatives").update({ current_value: isNaN(v) ? null : v }).eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Valor atual atualizado");
    load();
  };

  const submitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const week = mondayOf(new Date());
    const { error } = await supabase.from("weekly_checkins").insert({
      initiative_id: id!,
      week_date: week,
      status_snapshot: statusSnap,
      progress_delta: progress || null,
      blockers: blockers || null,
      next_steps: nextSteps || null,
      author: "Gabriel",
    });
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    await supabase.from("initiatives").update({ status: statusSnap, impediment: blockers || null }).eq("id", id!);
    setSaving(false);
    setOpen(false);
    setProgress(""); setBlockers(""); setNextSteps("");
    toast.success("Check-in registrado");
    load();
  };

  if (loading) return <div className="container py-10 text-sm text-muted-foreground">Carregando…</div>;
  if (!data) return <div className="container py-10">Não encontrado</div>;

  const isOkrQ2 = data.category === "OKR Q2";
  const targetVal = data.target_value != null ? Number(data.target_value) : null;
  const currentVal = data.current_value != null ? Number(data.current_value) : 0;
  const indicatorPct = targetVal && targetVal > 0 ? Math.min(100, Math.round((currentVal / targetVal) * 100)) : 0;

  return (
    <div className="container py-6 md:py-10 max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
      </Button>

      <Card className="surface-elevated p-8 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={data.category} />
              {krCode && (
                <Link to="/initiatives" className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#0C2340]/[0.06] text-[#0C2340] border border-[#0C2340]/15 hover:bg-[#0C2340]/10 transition-colors">
                  {krCode}
                </Link>
              )}
              <span className="text-[10px] text-[#9EA7B3] metric">#{data.number}</span>
              {(() => {
                const hist = [...checkins].reverse().map((c) => ({ week_date: c.week_date, status_snapshot: c.status_snapshot }));
                const trend = computeTrend(hist);
                const tMeta = TREND_META[trend];
                const weeksShown = Math.min(8, hist.length || 1);
                return (
                  <div className="flex items-center gap-2 ml-1">
                    <StatusSparkline checkins={hist} currentStatus={data.status} width={160} height={24} />
                    <span className={cn("text-[10px] font-medium metric", tMeta.color)}>
                      {tMeta.icon} {tMeta.label}
                    </span>
                    <span className="text-[10px] text-[#9EA7B3]">últimas {weeksShown} semanas</span>
                  </div>
                );
              })()}
            </div>
            <h1 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#0C2340] leading-tight">{data.title}</h1>
            {data.description && <p className="text-[14px] text-[#3D4F66] max-w-2xl">{data.description}</p>}
            {(data.effort != null || data.impact != null) && (
              <div className="text-[12px] text-[#878787] metric">
                Esforço: <span className="text-[#0C2340] font-semibold">{data.effort ?? "—"}</span>
                {" | "}Impacto: <span className="text-[#0C2340] font-semibold">{data.impact ?? "—"}</span>
                {data.priority_score != null && <> {" | "}Peso: <span className="text-[#0C2340] font-semibold">{data.priority_score}</span></>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={data.status} onValueChange={(v) => updateStatus(v as InitiativeStatus)}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="inline-flex items-center gap-2"><StatusIcon status={s} className="w-3.5 h-3.5" /> {STATUS_META[s].label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <GenerateReportButton
              reportType="initiative_analysis"
              initiativeId={id!}
              label={aiReport ? "Reanalisar com IA" : "Analisar com IA"}
              variant="outline"
              size="sm"
              onGenerated={load}
            />
            <Button asChild variant="outline" size="sm">
              <Link to={`/initiatives/${id}/edit`}><Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-[#F3F4F6]">
          <Field label="Owner" value={data.owner ?? "—"} />
          <Field label="Prazo" value={formatDate(data.due_date)} />
          <Field label="Indicador" value={data.indicator ?? "—"} />
          <Field label="Tipo" value={data.indicator_type ?? "—"} />
        </div>
      </Card>

      {/* Indicator block (OKR Q2) */}
      {isOkrQ2 && (
        <Card className="surface-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-bold tracking-wider uppercase text-primary">Indicador de sucesso</h3>
            <span className="text-xs text-muted-foreground">{data.indicator_type ?? "—"}</span>
          </div>
          {data.indicator && <div className="text-sm">{data.indicator}</div>}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Valor atual</Label>
              <div className="flex gap-2">
                <Input value={currentValueEdit} onChange={(e) => setCurrentValueEdit(e.target.value)} placeholder="0" />
                <Button size="sm" onClick={saveCurrentValue}>Salvar</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Meta</Label>
              <div className="metric text-2xl font-bold">{targetVal ?? "—"}</div>
            </div>
          </div>
          {targetVal != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="metric font-semibold">{indicatorPct}%</span>
              </div>
              <Progress value={indicatorPct} className="h-2" />
            </div>
          )}
        </Card>
      )}

      {/* Impediment editable */}
      <Card className={`p-5 space-y-3 ${data.impediment ? "border-destructive/40 bg-destructive/5" : "surface-card"}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${data.impediment ? "text-destructive" : "text-muted-foreground"}`} />
          <h3 className="text-sm font-bold uppercase tracking-wider">Impedimento</h3>
        </div>
        <Textarea
          rows={2}
          value={impedimentEdit}
          onChange={(e) => setImpedimentEdit(e.target.value)}
          placeholder="Sem impedimentos. Descreva aqui qualquer bloqueio."
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={saveImpediment}>Salvar impedimento</Button>
        </div>
      </Card>

      {aiReport && (
        <Card className="surface-elevated p-5 border-primary/30">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary mb-3">
            <Sparkles className="w-3 h-3" /> Análise IA · gerada {formatDate(aiReport.generated_at)}
          </div>
          <Markdown content={aiReport.content} />
        </Card>
      )}

      {/* Check-ins timeline */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Timeline de check-ins</h2>
            <p className="text-xs text-muted-foreground">{checkins.length} registros · mais recente primeiro</p>
          </div>
          <Button onClick={() => setOpen((o) => !o)} className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-1.5" /> Novo check-in
          </Button>
        </div>

        {open && (
          <Card className="surface-elevated p-5 animate-fade-in">
            <form onSubmit={submitCheckin} className="space-y-4">
              <div className="text-xs text-muted-foreground">Semana: <span className="metric text-foreground">{formatDate(mondayOf(new Date()))}</span></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>O que avançou?</Label>
                  <Textarea rows={3} value={progress} onChange={(e) => setProgress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bloqueios?</Label>
                  <Textarea rows={3} value={blockers} onChange={(e) => setBlockers(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Próximos passos?</Label>
                  <Textarea rows={3} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={statusSnap} onValueChange={(v) => setStatusSnap(v as InitiativeStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="inline-flex items-center gap-2"><StatusIcon status={s} className="w-3.5 h-3.5" /> {STATUS_META[s].label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-gradient-primary">{saving ? "Salvando…" : "Salvar check-in"}</Button>
              </div>
            </form>
          </Card>
        )}

        {checkins.length === 0 ? (
          <Card className="surface-card p-8 text-center text-sm text-muted-foreground">
            Nenhum check-in registrado.
          </Card>
        ) : (
          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#E5E7EB]">
            {checkins.map((c) => (
              <div key={c.id} className="relative">
                <div className="absolute -left-[18px] top-3 w-2.5 h-2.5 rounded-full bg-[#9B26B6] border-2 border-background ring-2 ring-[#E5E7EB]" />
                <Card className="surface-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="metric text-[#0C2340] font-semibold">{formatDate(c.week_date)}</span>
                      <span className="text-[#9EA7B3]">·</span>
                      <span className="text-[#878787]">{c.author}</span>
                    </div>
                    <StatusBadge status={c.status_snapshot as InitiativeStatus} />
                  </div>
                  {c.progress_delta && <div className="text-sm text-[#3D4F66]">{c.progress_delta}</div>}
                  {c.blockers && <div className="text-sm text-[#C0392B]/85">{c.blockers}</div>}
                  {c.next_steps && (
                    <div className="text-xs text-[#878787] border-l-2 border-[#E5E7EB] pl-3">
                      <span className="uppercase tracking-wider font-semibold">Próximos: </span>{c.next_steps}
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[11px] uppercase tracking-widest text-[#9EA7B3] font-medium">{label}</div>
    <div className="text-[14px] text-[#0C2340] mt-1 truncate">{value}</div>
  </div>
);

export default InitiativeDetail;
