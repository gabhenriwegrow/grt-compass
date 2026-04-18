import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusBadge, StatusIcon } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Markdown } from "@/components/Markdown";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { ShareReportDialog } from "@/components/ShareReportDialog";
import { CATEGORIES, InitiativeStatus, STATUS_META, formatDate, mondayOf, sundayOf } from "@/lib/grt";
import { ChevronDown, Sparkles, Calendar, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Initiative = {
  id: string; number: number; title: string; category: string; status: InitiativeStatus; owner: string | null;
};
type Report = { id: string; content: string; generated_at: string; week_date: string | null };

type DraftState = {
  skip: boolean;
  progress: string;
  blockers: string;
  nextSteps: string;
  status: InitiativeStatus;
};

const Checkins = () => {
  const [week, setWeek] = useState(mondayOf(new Date()));
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadReport = async (w: string) => {
    const { data } = await supabase
      .from("ai_reports")
      .select("id,content,generated_at,week_date")
      .eq("report_type", "weekly_summary")
      .eq("week_date", w)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setReport(data as Report | null);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("initiatives")
        .select("id,number,title,category,status,owner")
        .order("number");
      const list = (data ?? []) as Initiative[];
      setInitiatives(list);
      // Initialize drafts
      const d: Record<string, DraftState> = {};
      list.forEach((i) => {
        d[i.id] = { skip: false, progress: "", blockers: "", nextSteps: "", status: i.status };
      });
      setDrafts(d);
      // Open all except "concluido"-only categories: simpler — open all, but auto-collapse concluido items
      setOpenCats(Object.fromEntries(CATEGORIES.map((c) => [c, true])));
      await loadReport(week);
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, []);

  useEffect(() => { loadReport(week); }, [week]);

  const grouped = useMemo(() => {
    const g: Record<string, Initiative[]> = {};
    for (const c of CATEGORIES) g[c] = [];
    for (const i of initiatives) (g[i.category] ??= []).push(i);
    return g;
  }, [initiatives]);

  const updatedCount = useMemo(
    () => Object.values(drafts).filter((d) => !d.skip && (d.progress.trim() || d.blockers.trim() || d.nextSteps.trim())).length,
    [drafts]
  );

  const setDraft = (id: string, patch: Partial<DraftState>) => {
    setDrafts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  };

  const saveAll = async () => {
    setSaving(true);
    const inserts: any[] = [];
    const updates: { id: string; status: InitiativeStatus; impediment: string | null }[] = [];
    for (const i of initiatives) {
      const d = drafts[i.id];
      if (!d || d.skip) continue;
      const hasContent = d.progress.trim() || d.blockers.trim() || d.nextSteps.trim();
      if (!hasContent && d.status === i.status) continue;
      inserts.push({
        initiative_id: i.id,
        week_date: week,
        status_snapshot: d.status,
        progress_delta: d.progress.trim() || null,
        blockers: d.blockers.trim() || null,
        next_steps: d.nextSteps.trim() || null,
        author: "Gabriel",
      });
      updates.push({ id: i.id, status: d.status, impediment: d.blockers.trim() || null });
    }
    if (inserts.length === 0) {
      setSaving(false);
      toast.info("Nenhum check-in para salvar");
      return;
    }
    const { error } = await supabase.from("weekly_checkins").insert(inserts);
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    await Promise.all(
      updates.map((u) => supabase.from("initiatives").update({ status: u.status, impediment: u.impediment }).eq("id", u.id))
    );
    toast.success(`${inserts.length} check-ins salvos`);
    // Reset drafts
    const fresh: Record<string, DraftState> = {};
    initiatives.forEach((i) => {
      const newStatus = updates.find((u) => u.id === i.id)?.status ?? i.status;
      fresh[i.id] = { skip: false, progress: "", blockers: "", nextSteps: "", status: newStatus };
    });
    setDrafts(fresh);
    setSaving(false);
    // Reload to refresh statuses
    const { data } = await supabase.from("initiatives").select("id,number,title,category,status,owner").order("number");
    setInitiatives((data ?? []) as Initiative[]);
  };

  return (
    <div className="container py-6 md:py-10 pb-32 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Check-in semanal</h1>
          <p className="text-sm text-muted-foreground">
            {initiatives.length} iniciativas · agrupadas por categoria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">Semana</div>
          <Input
            type="date"
            value={week}
            onChange={(e) => setWeek(mondayOf(new Date(e.target.value + "T00:00:00")))}
            className="w-44 h-9"
          />
          <span className="text-xs text-muted-foreground metric">
            {formatDate(week)} → {formatDate(sundayOf(week))}
          </span>
        </div>
      </div>

      {report && (
        <Card className="surface-elevated p-5 border-primary/30">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary">
              <Sparkles className="w-3 h-3" /> Resumo semanal · gerado {formatDate(report.generated_at)}
            </div>
            <ShareReportDialog
              reportId={report.id}
              reportType="weekly_summary"
              weekDate={report.week_date}
              trigger={
                <Button size="sm" variant="outline">
                  <Share2 className="w-3.5 h-3.5 mr-1.5" /> Enviar para Bruno
                </Button>
              }
            />
          </div>
          <Markdown content={report.content} />
        </Card>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const list = grouped[cat] ?? [];
            if (!list.length) return null;
            const isOpen = openCats[cat] ?? true;
            return (
              <Collapsible key={cat} open={isOpen} onOpenChange={(o) => setOpenCats((p) => ({ ...p, [cat]: o }))} className="surface-card overflow-hidden">
                <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <ChevronDown className={cn("w-4 h-4 transition-transform", !isOpen && "-rotate-90")} />
                    <CategoryBadge category={cat} />
                    <span className="text-xs text-muted-foreground metric">{list.length}</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="divide-y divide-border border-t border-border">
                    {list.map((i) => {
                      const d = drafts[i.id];
                      const isDone = i.status === "concluido";
                      return (
                        <BatchRow
                          key={i.id}
                          init={i}
                          draft={d}
                          defaultCollapsed={isDone}
                          onChange={(patch) => setDraft(i.id, patch)}
                        />
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 md:left-60 right-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3">
        <div className="container flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            <span className="metric font-bold text-foreground">{updatedCount}</span> iniciativas com update preenchido
          </div>
          <div className="flex items-center gap-2">
            <GenerateReportButton
              reportType="weekly_summary"
              weekDate={week}
              label={report ? "Regerar resumo IA" : "Gerar resumo IA"}
              variant="outline"
              size="sm"
              onGenerated={() => loadReport(week)}
            />
            <Button onClick={saveAll} disabled={saving || updatedCount === 0} className="bg-[#0C2340] hover:bg-[#1A3A5C]">
              {saving ? "Salvando…" : `Salvar todos os check-ins (${updatedCount})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BatchRow = ({
  init, draft, defaultCollapsed, onChange,
}: {
  init: Initiative;
  draft: DraftState;
  defaultCollapsed: boolean;
  onChange: (patch: Partial<DraftState>) => void;
}) => {
  const [open, setOpen] = useState(!defaultCollapsed);
  if (!draft) return null;
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 min-w-0 text-left flex-1">
          <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", !open && "-rotate-90")} />
          <span className="text-xs text-muted-foreground metric">#{init.number}</span>
          <span className="text-sm font-medium truncate">{init.title}</span>
        </button>
        <StatusBadge status={init.status} />
        <Link to={`/initiatives/${init.id}`} className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary">
          Abrir →
        </Link>
      </div>

      {open && (
        <>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox checked={draft.skip} onCheckedChange={(v) => onChange({ skip: !!v })} />
            Sem atualização esta semana
          </label>

          <div className={cn("grid md:grid-cols-3 gap-3", draft.skip && "opacity-40 pointer-events-none")}>
            <Textarea rows={2} placeholder="O que avançou?" value={draft.progress} onChange={(e) => onChange({ progress: e.target.value })} />
            <Textarea rows={2} placeholder="Bloqueios?" value={draft.blockers} onChange={(e) => onChange({ blockers: e.target.value })} />
            <Textarea rows={2} placeholder="Próximos passos?" value={draft.nextSteps} onChange={(e) => onChange({ nextSteps: e.target.value })} />
          </div>

          <div className={cn("flex items-center gap-2", draft.skip && "opacity-40 pointer-events-none")}>
            <span className="text-xs text-muted-foreground">Atualizar status:</span>
            <Select value={draft.status} onValueChange={(v) => onChange({ status: v as InitiativeStatus })}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="inline-flex items-center gap-2"><StatusIcon status={s} className="w-3.5 h-3.5" /> {STATUS_META[s].label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
};

export default Checkins;
