import { Health, InitiativeStatus, STATUS_META, HEALTH_META } from "@/lib/grt";
import { cn } from "@/lib/utils";

export const StatusBadge = ({ status, className }: { status: InitiativeStatus; className?: string }) => {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border bg-secondary/40 border-border", className)}>
      <span className={cn("status-dot", m.dot)} />
      <span className={m.color}>{m.label}</span>
    </span>
  );
};

export const HealthBadge = ({ health, className }: { health: Health; className?: string }) => {
  const m = HEALTH_META[health];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border", m.bg, className)}>
      <span>{m.emoji}</span>
      <span className={m.color}>{m.label}</span>
    </span>
  );
};
