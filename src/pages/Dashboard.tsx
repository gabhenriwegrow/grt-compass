import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HealthBadge, StatusBadge } from "@/components/StatusBadge";
import { CATEGORIES, formatBRL, formatMetric, Health, InitiativeStatus, STATUS_META } from "@/lib/grt";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Target as TargetIcon, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

type Objective = {
  id: string; statement: string; target_annual: number; target_monthly: number;
  timeframe: string; health: Health; confidence: number;
};
type KR = {
  id: string; objective_id: string; code: string; title: string;
  metric_type: "number"|"percentage"|"currency"|"boolean";
  baseline: number; target: number; current_value: number; unit: string | null; health: Health; owner: string | null;
};
type Initiative = {
  id: string; title: string; category: string; status: InitiativeStatus; owner: string | null;
  due_date: string | null; impediment: string | null;
};

const Dashboard = () => {
  const [objective, setObjective] = useState<Objective | null>(null);
  const [krs, setKrs] = useState<KR[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [objRes, krRes, initRes] = await Promise.all([
        supabase.from("objectives").select("*").limit(1).maybeSingle(),
        supabase.from("key_results").select("*").order("code"),
        supabase.from("initiatives").select("id,title,category,status,owner,due_date,impediment").order("updated_at", { ascending: false }),
      ]);
      setObjective(objRes.data as Objective | null);
      setKrs((krRes.data ?? []) as KR[]);
      setInitiatives((initRes.data ?? []) as Initiative[]);
      setLoading(false);
    })();
  }, []);

  const objectiveProgress = objective
    ? Math.min(100, krs.length ? Math.round(krs.reduce((acc, k) => acc + Math.min(1, k.target ? k.current_value / k.target : 0), 0) / krs.length * 100) : 0)
    : 0;

  const counts = initiatives.reduce<Record<InitiativeStatus, number>>(
    (acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }),
    { concluido: 0, em_andamento: 0, bloqueado: 0, nao_iniciado: 0, pausado: 0 }
  );

  const blocked = initiatives.filter((i) => i.status === "bloqueado");

  return (
    <div className="container py-6 md:py-10 space-y-8">
      {/* Hero objective */}
      <section className="surface-elevated p-6 md:p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-50 pointer-events-none" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-primary/15 text-primary border border-primary/30 font-mono uppercase tracking-wider">Objetivo {objective?.timeframe ?? "2026"}</span>
            {objective && <HealthBadge health={objective.health} />}
            {objective && <span className="text-muted-foreground">Confiança <span className="text-foreground metric font-semibold">{objective.confidence}%</span></span>}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight max-w-3xl leading-tight">
            {objective?.statement ?? "—"}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricBox icon={<TargetIcon className="w-4 h-4" />} label="Meta anual" value={formatBRL(objective?.target_annual)} />
            <MetricBox icon={<Activity className="w-4 h-4" />} label="Meta mensal" value={formatBRL(objective?.target_monthly)} />
            <MetricBox icon={<TrendingUp className="w-4 h-4" />} label="Progresso" value={`${objectiveProgress}%`} extra={<Progress value={objectiveProgress} className="h-1.5 mt-2" />} />
          </div>
        </div>
      </section>

      {/* KRs */}
      <section className="space-y-3">
        <header className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Resultados-chave</h2>
            <p className="text-xs text-muted-foreground">Indicadores que comprovam o objetivo.</p>
          </div>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {krs.map((kr) => {
            const pct = kr.target ? Math.min(100, Math.round((kr.current_value / kr.target) * 100)) : 0;
            return (
              <Card key={kr.id} className="surface-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-mono text-primary tracking-widest uppercase">{kr.code}</div>
                    <div className="text-sm font-semibold mt-1 leading-snug">{kr.title}</div>
                  </div>
                  <HealthBadge health={kr.health} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="metric text-2xl font-bold">{formatMetric(kr.current_value, kr.metric_type)}</span>
                    <span className="text-xs text-muted-foreground metric">/ {formatMetric(kr.target, kr.metric_type)}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Owner: {kr.owner ?? "—"}</span>
                    <span className="metric">{pct}%</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Status grid */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => (
          <Card key={s} className="surface-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className={`status-dot ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label}
            </div>
            <div className="metric text-3xl font-bold">{counts[s]}</div>
          </Card>
        ))}
      </section>

      {/* Blocked */}
      {blocked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            🔴 Iniciativas bloqueadas
            <span className="text-xs font-normal text-muted-foreground">({blocked.length})</span>
          </h2>
          <div className="space-y-2">
            {blocked.map((i) => (
              <Link key={i.id} to={`/initiatives/${i.id}`} className="block surface-card p-4 hover:border-destructive/50 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.category}</div>
                    <div className="font-semibold mt-1 truncate">{i.title}</div>
                    {i.impediment && <div className="text-xs text-destructive mt-1.5">⚠ {i.impediment}</div>}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent initiatives */}
      <section className="space-y-3">
        <header className="flex items-end justify-between">
          <h2 className="text-lg font-bold tracking-tight">Iniciativas recentes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/initiatives">Ver todas <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        </header>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : initiatives.length === 0 ? (
          <Card className="surface-card p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">Nenhuma iniciativa cadastrada ainda.</p>
            <Button asChild className="bg-gradient-primary">
              <Link to="/initiatives/new">Criar primeira iniciativa</Link>
            </Button>
          </Card>
        ) : (
          <div className="surface-card divide-y divide-border">
            {initiatives.slice(0, 8).map((i) => (
              <Link key={i.id} to={`/initiatives/${i.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{i.category}</span>
                  </div>
                  <div className="text-sm font-medium truncate mt-0.5">{i.title}</div>
                </div>
                <StatusBadge status={i.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Categories overview */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Por categoria</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => {
            const list = initiatives.filter((i) => i.category === cat);
            const done = list.filter((i) => i.status === "concluido").length;
            return (
              <Card key={cat} className="surface-card p-4">
                <div className="text-xs text-muted-foreground">{cat}</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="metric text-2xl font-bold">{list.length}</div>
                  <div className="text-xs text-success metric">{done} concluídas</div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const MetricBox = ({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: string; extra?: React.ReactNode }) => (
  <div className="rounded-lg bg-background/40 border border-border p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon} {label}
    </div>
    <div className="metric text-2xl md:text-3xl font-bold mt-1">{value}</div>
    {extra}
  </div>
);

export default Dashboard;
