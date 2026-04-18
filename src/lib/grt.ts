export type InitiativeStatus = "concluido" | "em_andamento" | "bloqueado" | "nao_iniciado" | "pausado";
export type Health = "on_track" | "at_risk" | "off_track" | "achieved";

export const STATUS_META: Record<InitiativeStatus, { label: string; emoji: string; color: string; dot: string }> = {
  concluido:     { label: "Concluído",    emoji: "🟢", color: "text-success",     dot: "bg-success" },
  em_andamento:  { label: "Em andamento", emoji: "🔵", color: "text-primary",     dot: "bg-primary" },
  bloqueado:     { label: "Bloqueado",    emoji: "🔴", color: "text-destructive", dot: "bg-destructive" },
  nao_iniciado:  { label: "Não iniciado", emoji: "⚪", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  pausado:       { label: "Pausado",      emoji: "🟡", color: "text-warning",     dot: "bg-warning" },
};

export const HEALTH_META: Record<Health, { label: string; emoji: string; color: string; bg: string }> = {
  on_track:  { label: "On track",   emoji: "🟢", color: "text-success",     bg: "bg-success/10 border-success/30" },
  at_risk:   { label: "Em risco",   emoji: "🟡", color: "text-warning",     bg: "bg-warning/10 border-warning/30" },
  off_track: { label: "Off track",  emoji: "🔴", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  achieved:  { label: "Atingido",   emoji: "✅", color: "text-success",     bg: "bg-success/10 border-success/30" },
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
  const day = date.getDay(); // 0 sun .. 6 sat
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

// DD/MM/YYYY format
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

// % of year elapsed (for 2026)
export const pctOfYearElapsed = (year = 2026): number => {
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
};

// Number of months elapsed in current year (1-12)
export const monthsElapsed = (year = 2026): number => {
  const now = new Date();
  if (now.getFullYear() < year) return 0;
  if (now.getFullYear() > year) return 12;
  return now.getMonth() + 1; // 1..12
};

// Compute objective health based on accumulated MRR vs proportional target
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

// KR health based on % of completed initiatives
export const computeKrHealth = (completed: number, total: number): Health => {
  if (total === 0) return "at_risk";
  const pct = (completed / total) * 100;
  if (pct >= 70) return "on_track";
  if (pct >= 40) return "at_risk";
  return "off_track";
};

// Parse number from BR string (R$ 1.260.000,00) or US string
export const parseBRNumber = (input: string): number => {
  if (!input) return 0;
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};
