import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, string> = {
  "Impacto Rápido":          "bg-[#0C2340] text-white",
  "Impacto Médio Prazo":     "bg-[#0C2340] text-white",
  "Impacto Estrutural":      "bg-[#0C2340] text-white",
  "Automação - Ferramenta":  "bg-[#3D4F66] text-white",
  "Automação - HubSpot":     "bg-[#3D4F66] text-white",
  "Automação - Vibe Coding": "bg-[#3D4F66] text-white",
  "OKR Q2":                  "bg-[#9B26B6] text-white",
};

export const CategoryBadge = ({ category, className }: { category: string; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide",
      CATEGORY_STYLES[category] ?? "bg-[#3D4F66] text-white",
      className
    )}
  >
    {category}
  </span>
);
