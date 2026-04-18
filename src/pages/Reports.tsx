import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/Markdown";
import { GenerateReportButton } from "@/components/GenerateReportButton";
import { ShareReportDialog } from "@/components/ShareReportDialog";
import { formatDate } from "@/lib/grt";
import { ArrowLeft, FileText, ClipboardCheck, Sparkles, Briefcase, Share2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

type Report = {
  id: string;
  report_type: "weekly_summary" | "initiative_analysis" | "executive_briefing" | string;
  scope: string;
  content: string;
  generated_at: string;
  week_date: string | null;
};

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  weekly_summary:       { label: "Resumo semanal",      icon: ClipboardCheck, color: "text-primary" },
  initiative_analysis:  { label: "Análise de iniciativa", icon: FileText,     color: "text-warning" },
  executive_briefing:   { label: "Briefing executivo",   icon: Briefcase,     color: "text-success" },
};

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [active, setActive] = useState<Report | null>(null);
  const [titlesByScope, setTitlesByScope] = useState<Record<string, string>>({});
  const [sharedMap, setSharedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("ai_reports")
      .select("*")
      .order("generated_at", { ascending: false });
    const list = (data ?? []) as Report[];
    setReports(list);

    // fetch initiative titles for analysis reports
    const ids = Array.from(
      new Set(list.filter((r) => r.report_type === "initiative_analysis").map((r) => r.scope))
    );
    if (ids.length) {
      const { data: inits } = await supabase
        .from("initiatives")
        .select("id,title")
        .in("id", ids);
      const map: Record<string, string> = {};
      for (const i of inits ?? []) map[i.id] = i.title;
      setTitlesByScope(map);
    }

    // fetch shared reports for indicators
    const reportIds = list.map((r) => r.id);
    if (reportIds.length) {
      const { data: shares } = await supabase
        .from("shared_reports")
        .select("ai_report_id, token, created_at")
        .in("ai_report_id", reportIds)
        .order("created_at", { ascending: false });
      const sm: Record<string, string> = {};
      for (const s of shares ?? []) {
        if (!sm[s.ai_report_id]) sm[s.ai_report_id] = s.token; // most recent first
      }
      setSharedMap(sm);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (active) {
    const meta = TYPE_META[active.report_type] ?? { label: active.report_type, icon: FileText, color: "text-foreground" };
    const Icon = meta.icon;
    return (
      <div className="container py-6 md:py-10 max-w-4xl space-y-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setActive(null)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar para relatórios
          </Button>
          <ShareReportDialog
            reportId={active.id}
            reportType={active.report_type}
            weekDate={active.week_date}
            trigger={
              <Button size="sm" variant="outline">
                <Share2 className="w-4 h-4 mr-1.5" /> Compartilhar
              </Button>
            }
          />
        </div>
        <Card className="surface-elevated p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold ${meta.color}`}>
              <Icon className="w-3.5 h-3.5" /> {meta.label}
            </span>
            <span className="text-xs text-muted-foreground metric">· {formatDate(active.generated_at)}</span>
            {active.week_date && (
              <span className="text-xs text-muted-foreground metric">· semana de {formatDate(active.week_date)}</span>
            )}
            {active.report_type === "initiative_analysis" && titlesByScope[active.scope] && (
              <span className="text-xs text-muted-foreground">· {titlesByScope[active.scope]}</span>
            )}
          </div>
          <Markdown content={active.content} />
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 md:py-10 space-y-6 max-w-5xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios IA</h1>
          <p className="text-sm text-muted-foreground">{reports.length} relatórios gerados</p>
        </div>
        <GenerateReportButton
          reportType="executive_briefing"
          label="Gerar briefing executivo"
          onGenerated={(r) => { load(); setActive(r); }}
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : reports.length === 0 ? (
        <Card className="surface-card p-10 text-center text-sm text-muted-foreground">
          <Sparkles className="w-6 h-6 mx-auto mb-3 text-primary/60" />
          Nenhum relatório ainda. Gere um briefing executivo ou um resumo semanal nos Check-ins.
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const meta = TYPE_META[r.report_type] ?? { label: r.report_type, icon: FileText, color: "text-foreground" };
            const Icon = meta.icon;
            const subtitle =
              r.report_type === "weekly_summary" && r.week_date
                ? `Semana de ${formatDate(r.week_date)}`
                : r.report_type === "initiative_analysis"
                  ? titlesByScope[r.scope] ?? "Iniciativa"
                  : "Visão consolidada do objetivo, KRs e iniciativas";
            const preview = r.content.replace(/[#*`_>]/g, "").replace(/\s+/g, " ").trim().slice(0, 220);
            const sharedToken = sharedMap[r.id];
            return (
              <button
                key={r.id}
                onClick={() => setActive(r)}
                className="w-full text-left surface-card p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold ${meta.color}`}>
                      <Icon className="w-3 h-3" /> {meta.label}
                    </div>
                    <div className="font-semibold truncate flex items-center gap-2">
                      {subtitle}
                      {sharedToken && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `${window.location.origin}/relatorio/${sharedToken}`;
                                navigator.clipboard.writeText(url).then(
                                  () => toast.success("Link copiado!"),
                                  () => toast.error("Não foi possível copiar"),
                                );
                              }}
                              className="inline-flex items-center text-primary/80 hover:text-primary"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Compartilhado — clique para copiar link</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{preview}…</p>
                  </div>
                  <span className="text-xs text-muted-foreground metric whitespace-nowrap">
                    {formatDate(r.generated_at)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reports;
