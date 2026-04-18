import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, string> = {
  "Impacto Rápido":          "bg-[#9B26B6]/10 text-[#9B26B6] border-[#9B26B6]/30",
  "Impacto Médio Prazo":     "bg-[#0C2340]/10 text-[#0C2340] border-[#0C2340]/30",
  "Impacto Estrutural":      "bg-[#B07D1A]/10 text-[#B07D1A] border-[#B07D1A]/30",
  "Automação - Ferramenta":  "bg-[#3D4F66]/10 text-[#3D4F66] border-[#3D4F66]/30",
  "Automação - HubSpot":     "bg-[#3D4F66]/10 text-[#3D4F66] border-[#3D4F66]/30",
  "Automação - Vibe Coding": "bg-[#3D4F66]/10 text-[#3D4F66] border-[#3D4F66]/30",
  "OKR Q2":                  "bg-[#C0392B]/10 text-[#C0392B] border-[#C0392B]/30",
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
