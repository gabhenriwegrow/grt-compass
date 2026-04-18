import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { InitiativeStatus, formatDate } from "@/lib/grt";

type Row = {
  id: string;
  week_date: string;
  status_snapshot: string;
  progress_delta: string | null;
  blockers: string | null;
  author: string;
  created_at: string;
  initiatives: { id: string; title: string; category: string } | null;
};

const Checkins = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("weekly_checkins")
        .select("id, week_date, status_snapshot, progress_delta, blockers, author, created_at, initiatives(id,title,category)")
        .order("week_date", { ascending: false })
        .order("created_at", { ascending: false });
      setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  // Group by week
  const grouped = rows.reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.week_date] ??= []).push(r);
    return acc;
  }, {});
  const weeks = Object.keys(grouped).sort().reverse();

  return (
    <div className="container py-6 md:py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check-ins semanais</h1>
        <p className="text-sm text-muted-foreground">{rows.length} registros · agrupados por semana</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : weeks.length === 0 ? (
        <Card className="surface-card p-10 text-center text-sm text-muted-foreground">
          Nenhum check-in registrado. Acesse uma iniciativa para criar o primeiro.
        </Card>
      ) : (
        <div className="space-y-8">
          {weeks.map((week) => (
            <section key={week} className="space-y-3">
              <header className="flex items-baseline gap-3 border-b border-border pb-2">
                <h2 className="text-sm font-bold tracking-wider uppercase text-primary">Semana de {formatDate(week)}</h2>
                <span className="text-xs text-muted-foreground metric">{grouped[week].length} updates</span>
              </header>
              <div className="space-y-2">
                {grouped[week].map((c) => (
                  <Link key={c.id} to={`/initiatives/${c.initiatives?.id}`} className="block surface-card p-4 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.initiatives?.category}</div>
                        <div className="font-semibold truncate mt-0.5">{c.initiatives?.title ?? "—"}</div>
                      </div>
                      <StatusBadge status={c.status_snapshot as InitiativeStatus} />
                    </div>
                    {c.progress_delta && <div className="text-sm mt-3 text-foreground/90">{c.progress_delta}</div>}
                    {c.blockers && <div className="text-sm mt-2 text-destructive">⚠ {c.blockers}</div>}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Checkins;
