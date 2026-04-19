import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Variant = "default" | "outline";

interface Props {
  reportType: "weekly_summary" | "initiative_analysis" | "executive_briefing";
  weekDate?: string;
  initiativeId?: string;
  label?: string;
  variant?: Variant;
  onGenerated?: (report: any) => void;
  size?: "default" | "sm";
}

export const GenerateReportButton = ({
  reportType,
  weekDate,
  initiativeId,
  label = "Gerar com IA",
  variant = "default",
  onGenerated,
  size = "default",
}: Props) => {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-report", {
        body: {
          report_type: reportType,
          week_date: weekDate,
          initiative_id: initiativeId,
        },
      });
      if (error) {
        const msg = String(error.message ?? error);
        if (msg.toLowerCase().includes("non-2xx") || msg.toLowerCase().includes("non 2xx")) {
          toast.error("Erro ao gerar relatório. Tente novamente em alguns segundos.");
        } else {
          toast.error(msg || "Falha ao gerar relatório");
        }
        return;
      }
      if ((data as any)?.error) {
        const msg = String((data as any).error);
        if (msg.includes("429")) toast.error("Muitas requisições. Aguarde um momento.");
        else if (msg.includes("402")) toast.error("Créditos da IA esgotados.");
        else toast.error(msg);
        return;
      }
      toast.success("Relatório gerado");
      onGenerated?.((data as any).report);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.toLowerCase().includes("non-2xx") || msg.toLowerCase().includes("non 2xx")) {
        toast.error("Erro ao gerar relatório. Tente novamente em alguns segundos.");
      } else {
        toast.error(msg || "Falha ao gerar relatório");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={generate}
      disabled={loading}
      variant={variant}
      size={size}
      className={variant === "default" ? "bg-[#9B26B6] hover:bg-[#8A22A3] text-white" : undefined}
    >
      {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
      {loading ? "Gerando…" : label}
    </Button>
  );
};
