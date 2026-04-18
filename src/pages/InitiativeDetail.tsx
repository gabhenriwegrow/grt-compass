import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Markdown } from "@/components/Markdown";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { InitiativeStatus, STATUS_META, formatDate, mondayOf } from "@/lib/grt";
import { ArrowLeft, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [aiReport, setAiReport] = useState<{ id: string; content: string; generated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // checkin form
  const [statusSnap, setStatusSnap] = useState<InitiativeStatus>("em_andamento");
  const [progress, setProgress] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [iRes, cRes, rRes] = await Promise.all([
      supabase.from("initiatives").select("*").eq("id", id!).maybeSingle(),
      supabase.from("weekly_checkins").select("*").eq("initiative_id", id!).order("week_date", { ascending: false }),
      supabase
        .from("ai_reports")
        .select("id,content,generated_at")
        .eq("report_type", "initiative_analysis")
        .eq("scope", id!)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setData(iRes.data);
    setCheckins((cRes.data ?? []) as Checkin[]);
    setAiReport(rRes.data as any);
    if (iRes.data) setStatusSnap(iRes.data.status as InitiativeStatus);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

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
      notes: notes || null,
      author: "Gabriel",
    });
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    // Update initiative status to match snapshot
    await supabase.from("initiatives").update({ status: statusSnap, impediment: blockers || null }).eq("id", id!);
    setSaving(false);
    setOpen(false);
    setProgress(""); setBlockers(""); setNextSteps(""); setNotes("");
    toast.success("Check-in registrado");
    load();
  };

  if (loading) return <div className="container py-10 text-sm text-muted-foreground">Carregando…</div>;
  if (!data) return <div className="container py-10">Não encontrado</div>;

  return (
    <div className="container py-6 md:py-10 max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
      </Button>

      <Card className="surface-elevated p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-2 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-primary font-mono">{data.category}</div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{data.title}</h1>
            {data.description && <p className="text-sm text-muted-foreground max-w-2xl">{data.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={data.status} />
            <Button asChild variant="outline" size="sm">
              <Link to={`/initiatives/${id}/edit`}><Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border">
          <Field label="Owner" value={data.owner ?? "—"} />
          <Field label="Prazo" value={formatDate(data.due_date)} />
          <Field label="Esforço × Impacto" value={data.effort && data.impact ? `${data.effort} × ${data.impact}` : "—"} />
          <Field label="Prioridade" value={data.priority_score?.toString() ?? "—"} />
          <Field label="Indicador" value={data.indicator ?? "—"} />
          <Field label="Tipo" value={data.indicator_type ?? "—"} />
          <Field label="Atual / Alvo" value={data.target_value != null ? `${data.current_value ?? 0} / ${data.target_value}` : "—"} />
          <Field label="% Alvo" value={data.target_percentage != null ? `${data.target_percentage}%` : "—"} />
        </div>
        {data.impediment && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            ⚠ <strong>Impedimento:</strong> {data.impediment}
          </div>
        )}
      </Card>

      {/* Check-ins */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Histórico de check-ins</h2>
            <p className="text-xs text-muted-foreground">{checkins.length} registros</p>
          </div>
          <Button onClick={() => setOpen((o) => !o)} className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-1.5" /> Novo check-in
          </Button>
        </div>

        {open && (
          <Card className="surface-elevated p-5 animate-fade-in">
            <form onSubmit={submitCheckin} className="space-y-4">
              <div className="text-xs text-muted-foreground">Semana: <span className="metric text-foreground">{mondayOf(new Date())}</span></div>
              <div className="space-y-2">
                <Label>Status atual *</Label>
                <Select value={statusSnap} onValueChange={(v) => setStatusSnap(v as InitiativeStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_META[s].emoji} {STATUS_META[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>O que avançou</Label>
                  <Textarea rows={3} value={progress} onChange={(e) => setProgress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bloqueios</Label>
                  <Textarea rows={3} value={blockers} onChange={(e) => setBlockers(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Próximos passos</Label>
                  <Textarea rows={3} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-gradient-primary">{saving ? "Salvando…" : "Registrar check-in"}</Button>
              </div>
            </form>
          </Card>
        )}

        {checkins.length === 0 ? (
          <Card className="surface-card p-8 text-center text-sm text-muted-foreground">
            Nenhum check-in registrado.
          </Card>
        ) : (
          <div className="space-y-2">
            {checkins.map((c) => (
              <Card key={c.id} className="surface-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="metric text-muted-foreground">{formatDate(c.week_date)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{c.author}</span>
                  </div>
                  <StatusBadge status={c.status_snapshot as InitiativeStatus} />
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  {c.progress_delta && <Block label="Avanço">{c.progress_delta}</Block>}
                  {c.blockers && <Block label="Bloqueios" tone="destructive">{c.blockers}</Block>}
                  {c.next_steps && <Block label="Próximos passos">{c.next_steps}</Block>}
                  {c.notes && <Block label="Notas">{c.notes}</Block>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-sm font-medium mt-0.5 truncate">{value}</div>
  </div>
);

const Block = ({ label, children, tone }: { label: string; children: React.ReactNode; tone?: "destructive" }) => (
  <div className={`rounded-md border p-3 ${tone === "destructive" ? "border-destructive/30 bg-destructive/5" : "border-border bg-background/40"}`}>
    <div className={`text-[10px] uppercase tracking-wider mb-1 ${tone === "destructive" ? "text-destructive" : "text-muted-foreground"}`}>{label}</div>
    <div className="text-sm whitespace-pre-wrap">{children}</div>
  </div>
);

export default InitiativeDetail;
