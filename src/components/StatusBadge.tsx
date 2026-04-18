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
  const Icon = STATUS_ICONS[status];
  const sizeClasses = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  const iconSize = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium border bg-secondary/40 border-border",
        sizeClasses,
        className
      )}
    >
      <Icon className={cn(iconSize, m.color)} strokeWidth={2.25} />
      <span className={m.color}>{m.label}</span>
    </span>
  );
};

export const HealthBadge = ({ health, className }: { health: Health; className?: string }) => {
  const m = HEALTH_META[health];
  const Icon = HEALTH_ICONS[health];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border", m.bg, className)}>
      <Icon className={cn("w-3.5 h-3.5", m.color)} strokeWidth={2.25} />
      <span className={m.color}>{m.label}</span>
    </span>
  );
};
