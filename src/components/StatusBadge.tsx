import { Health, InitiativeStatus, STATUS_META, HEALTH_META } from "@/lib/grt";
import { cn } from "@/lib/utils";

export const StatusBadge = ({ status, className, size = "sm" }: { status: InitiativeStatus; className?: string; size?: "xs" | "sm" }) => {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium border bg-secondary/40 border-border",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
    >
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
