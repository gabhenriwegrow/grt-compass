import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HealthBadge, StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { StatusSparkline } from "@/components/StatusSparkline";
import {
  CATEGORIES, formatBRL, formatBRLShort, Health, InitiativeStatus, MONTH_NAMES_PT,
  STATUS_META, computeObjectiveHealth, computeKrHealth, monthsElapsed, pctOfYearElapsed, parseBRNumber,
  computeTrend,
} from "@/lib/grt";
import { classifyInitiativeRisk, InitiativeWithCheckin } from "@/lib/risks";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Target as TargetIcon, AlertTriangle, Pencil, Calendar, Activity, MessageSquare } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

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
  due_date: string | null; impediment: string | null; key_result_id: string | null;
};
type MonthlyMrr = { id: string; month: number; year: number; realized_value: number };

const Dashboard = () => {
  const [objective, setObjective] = useState<Objective | null>(null);
  const [krs, setKrs] = useState<KR[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [monthlyMrr, setMonthlyMrr] = useState<MonthlyMrr[]>([]);
  const [lastCheckinByInit, setLastCheckinByInit] = useState<Record<string, { date: string; status: InitiativeStatus }>>({});
  const [checkinsByInit, setCheckinsByInit] = useState<Record<string, Array<{ week_date: string; status_snapshot: string }>>>({});
  const [loading, setLoading] = useState(true);
  const [editingMonth, setEditingMonth] = useState<MonthlyMrr | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const load = async () => {
    const [objRes, krRes, initRes, mrrRes, ckRes] = await Promise.all([
      supabase.from("objectives").select("*").limit(1).maybeSingle(),
      supabase.from("key_results").select("*").order("code"),
      supabase.from("initiatives").select("id,title,category,status,owner,due_date,impediment,key_result_id"),
      supabase.from("monthly_mrr").select("*").eq("year", 2026).order("month"),
      supabase.from("weekly_checkins").select("initiative_id, week_date, status_snapshot, created_at").order("created_at", { ascending: false }),
    ]);
    setObjective(objRes.data as Objective | null);
    setKrs((krRes.data ?? []) as KR[]);
    setInitiatives((initRes.data ?? []) as Initiative[]);
    setMonthlyMrr((mrrRes.data ?? []) as MonthlyMrr[]);
    // Build last-checkin map AND per-initiative chronological history (oldest -> newest, deduped per week)
    const lastMap: Record<string, { date: string; status: InitiativeStatus }> = {};
    const histMap: Record<string, Map<string, { week_date: string; status_snapshot: string; created_at: string }>> = {};
    for (const c of (ckRes.data ?? []) as any[]) {
      if (!lastMap[c.initiative_id]) lastMap[c.initiative_id] = { date: c.week_date, status: c.status_snapshot };
      const m = (histMap[c.initiative_id] ??= new Map());
      const existing = m.get(c.week_date);
      if (!existing || existing.created_at < c.created_at) {
        m.set(c.week_date, { week_date: c.week_date, status_snapshot: c.status_snapshot, created_at: c.created_at });
      }
    }
    const histOut: Record<string, Array<{ week_date: string; status_snapshot: string }>> = {};
    for (const [initId, m] of Object.entries(histMap)) {
      const arr = Array.from(m.values()).sort((a, b) => a.week_date.localeCompare(b.week_date));
      histOut[initId] = arr.map(({ week_date, status_snapshot }) => ({ week_date, status_snapshot }));
    }
    setLastCheckinByInit(lastMap);
    setCheckinsByInit(histOut);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const mrrAccumulated = useMemo(() => monthlyMrr.reduce((s, m) => s + Number(m.realized_value || 0), 0), [monthlyMrr]);
  const monthlyTarget = objective?.target_monthly ?? 105000;
  const annualTarget = objective?.target_annual ?? 1260000;

  const yearPct = pctOfYearElapsed(2026);
  const goalPct = annualTarget > 0 ? Math.min(100, Math.round((mrrAccumulated / annualTarget) * 100)) : 0;
  const computedHealth = computeObjectiveHealth(mrrAccumulated, monthlyTarget, 2026);

  // Persist computed health if changed
  useEffect(() => {
    if (objective && objective.health !== computedHealth) {
      supabase.from("objectives").update({ health: computedHealth }).eq("id", objective.id);
    }
  }, [computedHealth, objective]);

  const counts = initiatives.reduce<Record<InitiativeStatus, number>>(
    (acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }),
    { concluido: 0, em_andamento: 0, bloqueado: 0, nao_iniciado: 0, pausado: 0 }
  );

  // KR computed health (% of completed initiatives linked)
  const krStats = useMemo(() => {
    return krs.map((kr) => {
      const linked = initiatives.filter((i) => i.key_result_id === kr.id);
      const done = linked.filter((i) => i.status === "concluido").length;
      const pct = linked.length ? Math.round((done / linked.length) * 100) : 0;
      const health = computeKrHealth(done, linked.length);
      return { kr, total: linked.length, done, pct, health };
    });
  }, [krs, initiatives]);

  // Persist KR health if drifted
  useEffect(() => {
    krStats.forEach(({ kr, health }) => {
      if (kr.health !== health) {
        supabase.from("key_results").update({ health }).eq("id", kr.id);
      }
    });
  }, [krStats]);

  // Attention list
  const attentionItems = useMemo(() => {
    const enriched: InitiativeWithCheckin[] = initiatives.map((i) => ({
      id: i.id, title: i.title, category: i.category, owner: i.owner, status: i.status,
      impediment: i.impediment, key_result_id: i.key_result_id,
      lastCheckinDate: lastCheckinByInit[i.id]?.date ?? null,
      lastCheckinStatus: lastCheckinByInit[i.id]?.status ?? null,
    }));
    return enriched
      .map((i) => ({ init: i, risk: classifyInitiativeRisk(i) }))
      .filter((x) => x.risk !== null);
  }, [initiatives, lastCheckinByInit]);

  // Team trend counts (exclude concluido and nao_iniciado)
  const trendCounts = useMemo(() => {
    const c = { improving: 0, stable: 0, declining: 0 };
    for (const i of initiatives) {
      if (i.status === "concluido" || i.status === "nao_iniciado") continue;
      const hist = checkinsByInit[i.id] ?? [];
      const t = computeTrend(hist);
      if (t === "improving") c.improving++;
      else if (t === "stable") c.stable++;
      else if (t === "declining") c.declining++;
    }
    return c;
  }, [initiatives, checkinsByInit]);

  // MRR chart data
  const chartData = MONTH_NAMES_PT.map((label, idx) => {
    const m = monthlyMrr.find((x) => x.month === idx + 1);
    return { mes: label, realized: Number(m?.realized_value ?? 0), meta: monthlyTarget };
  });

  const saveMonthValue = async () => {
    if (!editingMonth) return;
    const val = parseBRNumber(editingValue);
    const { error } = await supabase.from("monthly_mrr").update({ realized_value: val }).eq("id", editingMonth.id);
    if (error) return toast.error(error.message);
    toast.success("MRR atualizado");
    setEditingMonth(null);
    load();
  };

  return (
    <div className="container py-6 md:py-10 space-y-8">
      {/* Hero objective */}
      <section className="surface-elevated p-6 md:p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-50 pointer-events-none" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-primary/15 text-primary border border-primary/30 font-mono uppercase tracking-wider">Objetivo {objective?.timeframe ?? "2026"}</span>
            <HealthBadge health={computedHealth} />
            {objective && <span className="text-muted-foreground">Confiança <span className="text-foreground metric font-semibold">{objective.confidence}%</span></span>}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight max-w-3xl leading-tight">
            {objective?.statement ?? "—"}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricBox icon={<TargetIcon className="w-4 h-4" />} label="Meta anual" value={formatBRLShort(annualTarget)} />
            <MetricBox icon={<TrendingUp className="w-4 h-4" />} label="MRR realizado acumulado" value={formatBRLShort(mrrAccumulated)} />
            <MetricBox icon={<Calendar className="w-4 h-4" />} label="Meta mensal" value={formatBRLShort(monthlyTarget)} />
            <MetricBox icon={<Activity className="w-4 h-4" />} label="Tendência do time" value={`${trendCounts.improving} ↗ · ${trendCounts.stable} → · ${trendCounts.declining} ↘`} />
          </div>

          {/* Dual progress */}
          <div className="rounded-lg bg-background/40 border border-border p-4 space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Ano vs Meta</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Ano transcorrido</span>
                <span className="metric font-semibold">{yearPct}%</span>
              </div>
              <Progress value={yearPct} className="h-2 [&>div]:bg-muted-foreground" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Meta atingida</span>
                <span className={`metric font-semibold ${goalPct >= yearPct ? "text-success" : "text-warning"}`}>{goalPct}%</span>
              </div>
              <Progress value={goalPct} className="h-2" />
            </div>
            <div className="text-[11px] text-muted-foreground">
              {goalPct >= yearPct
                ? `✓ No ritmo: meta atingida (${goalPct}%) ≥ ano transcorrido (${yearPct}%)`
                : `⚠ Atrás do ritmo: faltam ${yearPct - goalPct}pp para acompanhar o ano`}
            </div>
          </div>
        </div>
      </section>

      {/* KRs */}
      <section className="space-y-3">
        <header>
          <h2 className="text-lg font-bold tracking-tight">Resultados-chave</h2>
          <p className="text-xs text-muted-foreground">Progresso medido pelo % de iniciativas concluídas.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {krStats.map(({ kr, total, done, pct, health }) => (
            <Card key={kr.id} className="surface-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono text-primary tracking-widest uppercase">{kr.code}</div>
                  <div className="text-sm font-semibold mt-1 leading-snug">{kr.title}</div>
                </div>
                <HealthBadge health={health} />
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="metric text-2xl font-bold">{done} <span className="text-base text-muted-foreground">de {total}</span></span>
                  <span className="text-xs text-muted-foreground">iniciativas</span>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Owner: {kr.owner ?? "—"}</span>
                  <span className="metric">{pct}% concluído</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* MRR Chart */}
      <section className="space-y-3">
        <header>
          <h2 className="text-lg font-bold tracking-tight">MRR mensal 2026</h2>
          <p className="text-xs text-muted-foreground">Clique em uma barra para editar o valor realizado do mês.</p>
        </header>
        <Card className="surface-card p-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toLocaleString("pt-BR")}k`} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #DADADA", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatBRL(v)}
                  cursor={{ fill: "rgba(155, 38, 182, 0.08)" }}
                />
                <ReferenceLine y={monthlyTarget} stroke="#878787" strokeDasharray="4 4" label={{ value: "Meta", fill: "#878787", fontSize: 10, position: "right" }} />
                <Bar
                  dataKey="realized"
                  fill="#0C2340"
                  radius={[6, 6, 0, 0]}
                  onClick={(_, idx) => {
                    const m = monthlyMrr.find((x) => x.month === idx + 1);
                    if (m) {
                      setEditingMonth(m);
                      setEditingValue(String(m.realized_value));
                    }
                  }}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Attention */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" /> Precisam de atenção
          <span className="text-xs font-normal text-muted-foreground">({attentionItems.length})</span>
        </h2>
        {attentionItems.length === 0 ? (
          <Card className="surface-card p-6 text-sm text-muted-foreground text-center">Nada pendente. ✨</Card>
        ) : (
          <div className="space-y-2">
            {attentionItems.map(({ init, risk }) => (
              <Link key={init.id} to={`/initiatives/${init.id}`} className="block surface-card p-4 hover:border-warning/40 transition-colors group">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={init.category} />
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/30 font-semibold">
                        {risk!.label}
                      </span>
                      {init.owner && <span className="text-[11px] text-muted-foreground">· {init.owner}</span>}
                    </div>
                    <div className="font-semibold truncate">{init.title}</div>
                    {init.impediment && <div className="text-xs text-destructive">⚠ {init.impediment}</div>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusSparkline
                      checkins={checkinsByInit[init.id] ?? []}
                      currentStatus={init.status}
                      width={80}
                      height={16}
                    />
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sem update há</div>
                      <div className="metric text-sm font-semibold">{risk!.daysSinceUpdate != null ? `${risk!.daysSinceUpdate}d` : "—"}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-warning transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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

      {/* Categories overview */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Por categoria</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => {
            const list = initiatives.filter((i) => i.category === cat);
            const done = list.filter((i) => i.status === "concluido").length;
            return (
              <Card key={cat} className="surface-card p-4">
                <CategoryBadge category={cat} />
                <div className="flex items-baseline justify-between mt-2">
                  <div className="metric text-2xl font-bold">{list.length}</div>
                  <div className="text-xs text-success metric">{done} concluídas</div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Edit month dialog */}
      <Dialog open={!!editingMonth} onOpenChange={(o) => !o && setEditingMonth(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar MRR realizado — {editingMonth ? MONTH_NAMES_PT[editingMonth.month - 1] : ""}/2026
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">Valor em R$ (use vírgula para decimais)</div>
            <Input
              autoFocus
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              placeholder="105000,00"
              onKeyDown={(e) => e.key === "Enter" && saveMonthValue()}
            />
            <div className="text-xs text-muted-foreground">Meta de referência: {formatBRL(monthlyTarget)}</div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditingMonth(null)}>Cancelar</Button>
              <Button onClick={saveMonthValue} className="bg-gradient-primary">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MetricBox = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-lg bg-background/40 border border-border p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon} {label}
    </div>
    <div className="metric text-2xl md:text-3xl font-bold mt-1">{value}</div>
  </div>
);

export default Dashboard;
