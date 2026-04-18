import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, string> = {
  "Impacto Rápido":          "bg-success/10 text-success border-success/30",
  "Impacto Médio Prazo":     "bg-primary/10 text-primary border-primary/30",
  "Impacto Estrutural":      "bg-warning/10 text-warning border-warning/30",
  "Automação - Ferramenta":  "bg-accent/40 text-foreground border-border",
  "Automação - HubSpot":     "bg-accent/40 text-foreground border-border",
  "Automação - Vibe Coding": "bg-accent/40 text-foreground border-border",
  "OKR Q2":                  "bg-destructive/10 text-destructive border-destructive/30",
};

export const CategoryBadge = ({ category, className }: { category: string; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border",
      CATEGORY_STYLES[category] ?? "bg-secondary/40 text-muted-foreground border-border",
      className
    )}
  >
    {category}
  </span>
);
