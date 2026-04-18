import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, InitiativeStatus, STATUS_META } from "@/lib/grt";
import { toast } from "sonner";
import { Upload, Sparkles } from "lucide-react";

const STATUS_KEYWORDS: Record<string, InitiativeStatus> = {
  "concluí": "concluido", "concluido": "concluido", "feito": "concluido", "done": "concluido",
  "em andamento": "em_andamento", "andamento": "em_andamento", "doing": "em_andamento", "wip": "em_andamento",
  "bloqueado": "bloqueado", "blocked": "bloqueado", "travado": "bloqueado",
  "pausado": "pausado", "paused": "pausado",
};

const detectStatus = (line: string): InitiativeStatus => {
  const l = line.toLowerCase();
  if (l.includes("🟢") || l.includes("✅")) return "concluido";
  if (l.includes("🔴")) return "bloqueado";
  if (l.includes("🟡")) return "pausado";
  if (l.includes("🔵")) return "em_andamento";
  for (const [kw, s] of Object.entries(STATUS_KEYWORDS)) if (l.includes(kw)) return s;
  return "nao_iniciado";
};

const Import = () => {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>("Impacto Rápido");
  const [defaultStatus, setDefaultStatus] = useState<InitiativeStatus>("nao_iniciado");
  const [owner, setOwner] = useState("Gabriel");
  const [autoStatus, setAutoStatus] = useState(true);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{ title: string; status: InitiativeStatus }[]>([]);

  const parseLines = () => {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      // remove leading bullets/numbers/emojis status markers
      .map((raw) => {
        const cleaned = raw
          .replace(/^[-•*\d.\)\s]+/g, "")
          .replace(/^[🟢🟡🔴⚪🔵✅]+\s*/g, "")
          .trim();
        const status = autoStatus ? detectStatus(raw) : defaultStatus;
        return { title: cleaned, status };
      })
      .filter((x) => x.title.length > 0);
  };

  const handlePreview = () => {
    setPreview(parseLines());
  };

  const handleImport = async () => {
    const items = parseLines();
    if (items.length === 0) return toast.error("Nada para importar");
    setImporting(true);
    const { count } = await supabase
      .from("initiatives")
      .select("*", { count: "exact", head: true })
      .eq("category", category);
    let n = count ?? 0;
    const payload = items.map((i) => ({
      title: i.title,
      category,
      status: i.status,
      owner: owner || null,
      number: ++n,
    }));
    const { error } = await supabase.from("initiatives").insert(payload);
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`${items.length} iniciativas importadas`);
    setText(""); setPreview([]);
  };

  return (
    <div className="container py-6 md:py-10 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar iniciativas</h1>
        <p className="text-sm text-muted-foreground">Cole uma lista (uma iniciativa por linha). Detectamos o status automaticamente quando há emojis (🟢🟡🔴🔵⚪) ou palavras-chave.</p>
      </div>

      <Card className="surface-card p-5 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status padrão</Label>
            <Select value={defaultStatus} onValueChange={(v) => setDefaultStatus(v as InitiativeStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].emoji} {STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <input className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={autoStatus} onChange={(e) => setAutoStatus(e.target.checked)} />
          <Sparkles className="w-4 h-4 text-primary" /> Detectar status automaticamente por emojis/palavras-chave
        </label>

        <div className="space-y-2">
          <Label>Cole as iniciativas</Label>
          <Textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"🟢 Implantar HubSpot Sales Hub Pro\n🔵 Criar cadência outbound para mid-market\n🔴 Definir ICP refinado para enterprise\n⚪ Treinar SDR no novo playbook"}
            className="font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="outline" onClick={handlePreview}>Pré-visualizar</Button>
          <Button type="button" onClick={handleImport} disabled={importing} className="bg-gradient-primary">
            <Upload className="w-4 h-4 mr-1.5" /> {importing ? "Importando…" : "Importar"}
          </Button>
        </div>
      </Card>

      {preview.length > 0 && (
        <Card className="surface-card divide-y divide-border">
          <div className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Pré-visualização ({preview.length})</div>
          {preview.map((p, idx) => (
            <div key={idx} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{p.title}</span>
              <span className="text-xs text-muted-foreground">{STATUS_META[p.status].emoji} {STATUS_META[p.status].label}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default Import;
