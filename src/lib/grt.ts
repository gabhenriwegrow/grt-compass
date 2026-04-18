export type InitiativeStatus = "concluido" | "em_andamento" | "bloqueado" | "nao_iniciado" | "pausado";
export type Health = "on_track" | "at_risk" | "off_track" | "achieved";

export const STATUS_META: Record<InitiativeStatus, { label: string; color: string; dot: string; iconName: string }> = {
  concluido:     { label: "Concluído",    color: "text-[#2D7D46]", dot: "bg-[#2D7D46]", iconName: "CheckCircle2" },
  em_andamento:  { label: "Em andamento", color: "text-[#0C2340]", dot: "bg-[#0C2340]", iconName: "Circle" },
  bloqueado:     { label: "Bloqueado",    color: "text-[#C0392B]", dot: "bg-[#C0392B]", iconName: "XCircle" },
  nao_iniciado:  { label: "Não iniciado", color: "text-[#878787]", dot: "bg-[#878787]", iconName: "MinusCircle" },
  pausado:       { label: "Pausado",      color: "text-[#B07D1A]", dot: "bg-[#B07D1A]", iconName: "PauseCircle" },
};

export const HEALTH_META: Record<Health, { label: string; color: string; bg: string; iconName: string }> = {
  on_track:  { label: "On track",   color: "text-[#2D7D46]", bg: "bg-[#2D7D46]/8 border-[#2D7D46]/20", iconName: "CheckCircle2" },
  at_risk:   { label: "Em risco",   color: "text-[#B07D1A]", bg: "bg-[#B07D1A]/8 border-[#B07D1A]/20", iconName: "AlertTriangle" },
  off_track: { label: "Off track",  color: "text-[#C0392B]", bg: "bg-[#C0392B]/8 border-[#C0392B]/20", iconName: "XCircle" },
  achieved:  { label: "Atingido",   color: "text-[#2D7D46]", bg: "bg-[#2D7D46]/8 border-[#2D7D46]/20", iconName: "CheckCircle2" },
};

export const CATEGORIES = [
  "Impacto Rápido",
  "Impacto Médio Prazo",
  "Impacto Estrutural",
  "Automação - Ferramenta",
  "Automação - HubSpot",
  "Automação - Vibe Coding",
  "OKR Q2",
] as const;

export type Category = typeof CATEGORIES[number];

export const MONTH_NAMES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MONTH_NAMES_PT_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const formatBRL = (v: number | null | undefined) => {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
};

export const formatBRLShort = (v: number | null | undefined) => {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
};

export const formatNumber = (v: number | null | undefined) => {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(v);
};

export const formatPct = (v: number | null | undefined) => {
  if (v == null) return "—";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;
};

export const formatMetric = (
  v: number | null | undefined,
  type: "number" | "percentage" | "currency" | "boolean"
) => {
  if (type === "currency") return formatBRL(v);
  if (type === "percentage") return formatPct(v);
  if (type === "boolean") return v ? "Sim" : "Não";
  return formatNumber(v);
};

// Returns Monday of the week for a given date in YYYY-MM-DD
export const mondayOf = (d: Date = new Date()): string => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

export const sundayOf = (mondayIso: string): string => {
  const d = new Date(mondayIso + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
};

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const formatDateShort = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export const daysBetween = (isoA: string, isoB: string = new Date().toISOString()): number => {
  const a = new Date(isoA.length <= 10 ? isoA + "T00:00:00" : isoA).getTime();
  const b = new Date(isoB.length <= 10 ? isoB + "T00:00:00" : isoB).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
};

export const pctOfYearElapsed = (year = 2026): number => {
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
};

export const monthsElapsed = (year = 2026): number => {
  const now = new Date();
  if (now.getFullYear() < year) return 0;
  if (now.getFullYear() > year) return 12;
  return now.getMonth() + 1;
};

export const computeObjectiveHealth = (mrrAcc: number, monthlyTarget: number, year = 2026): Health => {
  const months = monthsElapsed(year);
  if (months === 0) return "on_track";
  const expected = monthlyTarget * months;
  if (expected === 0) return "on_track";
  const ratio = mrrAcc / expected;
  if (ratio >= 1) return "on_track";
  if (ratio >= 0.7) return "at_risk";
  return "off_track";
};

export const computeKrHealth = (completed: number, total: number): Health => {
  if (total === 0) return "at_risk";
  const pct = (completed / total) * 100;
  if (pct >= 70) return "on_track";
  if (pct >= 40) return "at_risk";
  return "off_track";
};

export type Trend = "improving" | "stable" | "declining" | "new";

export const computeTrend = (
  checkins: Array<{ status_snapshot: string }>
): Trend => {
  if (checkins.length < 2) return "new";
  const statusScore: Record<string, number> = {
    concluido: 4,
    em_andamento: 3,
    pausado: 2,
    nao_iniciado: 1,
    bloqueado: 0,
  };
  const recent = statusScore[checkins[checkins.length - 1].status_snapshot] ?? 1;
  const previous = statusScore[checkins[checkins.length - 2].status_snapshot] ?? 1;
  if (recent > previous) return "improving";
  if (recent < previous) return "declining";
  return "stable";
};

export const TREND_META: Record<Trend, { label: string; icon: string; color: string }> = {
  improving: { label: "Melhorando", icon: "↗", color: "text-[#2D7D46]" },
  stable:    { label: "Estável",    icon: "→", color: "text-[#878787]" },
  declining: { label: "Piorando",   icon: "↘", color: "text-[#C0392B]" },
  new:       { label: "Novo",       icon: "•", color: "text-[#878787]" },
};

export const parseBRNumber = (input: string): number => {
  if (!input) return 0;
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};
