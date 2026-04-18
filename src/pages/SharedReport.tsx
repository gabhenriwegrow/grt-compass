import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { formatDate } from "@/lib/grt";
import { Target, Printer, FileText, ClipboardCheck, Briefcase, AlertCircle, Loader2 } from "lucide-react";

type SharedRow = {
  id: string;
  title: string;
  created_at: string;
  expires_at: string | null;
  view_count: number | null;
  ai_reports: {
    id: string;
    report_type: string;
    content: string;
    generated_at: string;
    week_date: string | null;
  } | null;
};

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  weekly_summary:      { label: "Resumo semanal",        icon: ClipboardCheck, color: "text-primary" },
  initiative_analysis: { label: "Análise de iniciativa", icon: FileText,       color: "text-warning" },
  executive_briefing:  { label: "Briefing executivo",    icon: Briefcase,      color: "text-success" },
};

const SharedReport = () => {
  const { token } = useParams();
  const [data, setData] = useState<SharedRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data: row } = await supabase
        .from("shared_reports")
        .select("id,title,created_at,expires_at,view_count,ai_reports(id,report_type,content,generated_at,week_date)")
        .eq("token", token)
        .maybeSingle();

      if (!row) { setNotFound(true); setLoading(false); return; }
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
        setExpired(true); setLoading(false); return;
      }
      setData(row as unknown as SharedRow);
      setLoading(false);
      // increment view_count (fire and forget)
      supabase
        .from("shared_reports")
        .update({ view_count: (row.view_count ?? 0) + 1 })
        .eq("id", row.id)
        .then(() => {});
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !data || !data.ai_reports) {
    return (
      <EmptyState
        title="Relatório não encontrado"
        message="O link pode estar incorreto ou o relatório foi removido."
      />
    );
  }

  if (expired) {
    return (
      <EmptyState
        title="Este relatório expirou"
        message="Solicite um novo link a quem compartilhou."
      />
    );
  }

  const r = data.ai_reports;
  const meta = TYPE_META[r.report_type] ?? { label: r.report_type, icon: FileText, color: "text-foreground" };
  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-background shared-report-page">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10 no-print">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0C2340] flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm tracking-tight truncate">GRT Command Center</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                Bernhoeft GRT · Relatório comercial
              </div>
            </div>
          </div>
          <Button onClick={() => window.print()} size="sm" variant="outline" className="shrink-0">
            <Printer className="w-4 h-4 mr-1.5" /> Imprimir / PDF
          </Button>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <Card className="surface-elevated p-6 md:p-10 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold ${meta.color}`}>
              <Icon className="w-3.5 h-3.5" /> {meta.label}
            </span>
            <span className="text-xs text-muted-foreground metric">· {formatDate(r.generated_at)}</span>
            {r.week_date && (
              <span className="text-xs text-muted-foreground metric">· semana de {formatDate(r.week_date)}</span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
            {data.title}
          </h1>

          <div className="h-px bg-border" />

          <Markdown content={r.content} />
        </Card>

        <footer className="text-center text-xs text-muted-foreground mt-8 no-print">
          Gerado automaticamente pelo <span className="text-foreground/80 font-medium">GRT Command Center</span> · Bernhoeft GRT
        </footer>
      </main>
    </div>
  );
};

const EmptyState = ({ title, message }: { title: string; message: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center px-4">
    <Card className="surface-elevated p-10 max-w-md text-center space-y-3">
      <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </Card>
  </div>
);

export default SharedReport;
