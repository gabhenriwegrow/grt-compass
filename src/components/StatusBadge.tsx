import { Health, InitiativeStatus, STATUS_META, HEALTH_META } from "@/lib/grt";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, XCircle, MinusCircle, PauseCircle, AlertTriangle } from "lucide-react";

const STATUS_ICONS: Record<InitiativeStatus, typeof CheckCircle2> = {
  concluido: CheckCircle2,
  em_andamento: Circle,
  bloqueado: XCircle,
  nao_iniciado: MinusCircle,
  pausado: PauseCircle,
};

const HEALTH_ICONS: Record<Health, typeof CheckCircle2> = {
  on_track: CheckCircle2,
  at_risk: AlertTriangle,
  off_track: XCircle,
  achieved: CheckCircle2,
};

export const StatusIcon = ({ status, className }: { status: InitiativeStatus; className?: string }) => {
  const Icon = STATUS_ICONS[status];
  const m = STATUS_META[status];
  return <Icon className={cn("w-3 h-3", m.color, className)} />;
};

export const StatusBadge = ({ status, className, size = "sm" }: { status: InitiativeStatus; className?: string; size?: "xs" | "sm" }) => {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        size === "xs" ? "text-[10px]" : "text-xs",
        "text-[#3D4F66]",
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", m.dot)} />
      {m.label}
    </span>
  );
};

export const HealthBadge = ({ health, className }: { health: Health; className?: string }) => {
  const m = HEALTH_META[health];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium",
        m.bg,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", m.color.replace("text-", "bg-"))} />
      <span className={m.color}>{m.label}</span>
    </span>
  );
};
