import { InitiativeStatus, daysBetween } from "@/lib/grt";

export type RiskKind = "estagnada" | "bloqueio_cronico" | "precisa_comecar" | "kr_atrasado";

export type RiskItem = {
  kind: RiskKind;
  label: string;
  daysSinceUpdate: number | null;
};

export type InitiativeWithCheckin = {
  id: string;
  title: string;
  category: string;
  owner: string | null;
  status: InitiativeStatus;
  impediment: string | null;
  key_result_id: string | null;
  lastCheckinDate: string | null;
  lastCheckinStatus: InitiativeStatus | null;
};

const RISK_LABEL: Record<RiskKind, string> = {
  estagnada: "Estagnada",
  bloqueio_cronico: "Bloqueio crônico",
  precisa_comecar: "Precisa começar",
  kr_atrasado: "KR atrasado",
};

export const classifyInitiativeRisk = (i: InitiativeWithCheckin): RiskItem | null => {
  if (i.status === "nao_iniciado") {
    return { kind: "precisa_comecar", label: RISK_LABEL.precisa_comecar, daysSinceUpdate: null };
  }
  if (i.status === "bloqueado") {
    if (!i.lastCheckinDate) return { kind: "bloqueio_cronico", label: RISK_LABEL.bloqueio_cronico, daysSinceUpdate: null };
    const days = daysBetween(i.lastCheckinDate);
    if (days > 14 && i.lastCheckinStatus === "bloqueado") {
      return { kind: "bloqueio_cronico", label: RISK_LABEL.bloqueio_cronico, daysSinceUpdate: days };
    }
    // Always surface blocked items as needing attention
    return { kind: "bloqueio_cronico", label: "Bloqueado", daysSinceUpdate: days };
  }
  if (i.status === "em_andamento") {
    if (!i.lastCheckinDate) {
      return { kind: "estagnada", label: RISK_LABEL.estagnada, daysSinceUpdate: null };
    }
    const days = daysBetween(i.lastCheckinDate);
    if (days > 14) return { kind: "estagnada", label: RISK_LABEL.estagnada, daysSinceUpdate: days };
  }
  return null;
};
