import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, string> = {
  "Impacto Rápido":          "bg-[#2D7D46]/[0.06] text-[#2D7D46] border-[#2D7D46]/15",
  "Impacto Médio Prazo":     "bg-[#0C2340]/[0.06] text-[#3D4F66] border-[#0C2340]/15",
  "Impacto Estrutural":      "bg-[#B07D1A]/[0.06] text-[#8A6215] border-[#B07D1A]/15",
  "Automação - Ferramenta":  "bg-[#9B26B6]/[0.06] text-[#7A1E91] border-[#9B26B6]/15",
  "Automação - HubSpot":     "bg-[#9B26B6]/[0.06] text-[#7A1E91] border-[#9B26B6]/15",
  "Automação - Vibe Coding": "bg-[#9B26B6]/[0.06] text-[#7A1E91] border-[#9B26B6]/15",
  "OKR Q2":                  "bg-[#0C2340]/[0.06] text-[#3D4F66] border-[#0C2340]/15",
};

export const CategoryBadge = ({ category, className }: { category: string; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border",
      CATEGORY_STYLES[category] ?? "bg-secondary/40 text-muted-foreground border-border",
      className
    )}
  >
    {category}
  </span>
);
