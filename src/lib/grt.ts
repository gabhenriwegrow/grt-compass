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

export const formatBRL = (v: number | null | undefined) => {
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

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};
