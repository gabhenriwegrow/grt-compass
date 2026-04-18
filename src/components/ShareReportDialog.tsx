import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Link2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/grt";

interface Props {
  reportId: string;
  reportType: string;
  weekDate?: string | null;
  trigger: React.ReactNode;
}

const defaultTitleFor = (type: string, weekDate?: string | null) => {
  if (type === "weekly_summary" && weekDate) return `Resumo semanal — ${formatDate(weekDate)}`;
  if (type === "executive_briefing") return `Briefing executivo — ${formatDate(new Date().toISOString())}`;
  if (type === "initiative_analysis") return `Análise de iniciativa — ${formatDate(new Date().toISOString())}`;
  return `Relatório — ${formatDate(new Date().toISOString())}`;
};

const toLocalDateInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const ShareReportDialog = ({ reportId, reportType, weekDate, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitleFor(reportType, weekDate));
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return toLocalDateInput(d);
  });
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  // when opening, look for existing share
  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitleFor(reportType, weekDate));
    setChecking(true);
    (async () => {
      const { data } = await supabase
        .from("shared_reports")
        .select("token,title")
        .eq("ai_report_id", reportId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setToken(data.token);
        setTitle(data.title);
      } else {
        setToken(null);
      }
      setChecking(false);
    })();
  }, [open, reportId, reportType, weekDate]);

  const url = token ? `${window.location.origin}/relatorio/${token}` : "";

  const generate = async () => {
    setLoading(true);
    const expires_at = hasExpiry ? new Date(`${expiryDate}T23:59:59`).toISOString() : null;
    const { data, error } = await supabase
      .from("shared_reports")
      .insert({ ai_report_id: reportId, title, expires_at })
      .select("token")
      .single();
    setLoading(false);
    if (error || !data) {
      toast.error("Não foi possível gerar o link");
      return;
    }
    setToken(data.token);
    const newUrl = `${window.location.origin}/relatorio/${data.token}`;
    try { await navigator.clipboard.writeText(newUrl); } catch {}
    toast.success("Link copiado! Envie para o Bruno.");
  };

  const copyExisting = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const regenerate = () => {
    setToken(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="surface-elevated max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" /> Compartilhar relatório
          </DialogTitle>
          <DialogDescription>
            Gere um link público para enviar para quem precisa ler o relatório, sem login.
          </DialogDescription>
        </DialogHeader>

        {checking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando…
          </div>
        ) : token ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Link público</Label>
              <div className="flex gap-2">
                <Input readOnly value={url} className="metric text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button onClick={copyExisting} size="icon" variant="secondary">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{title}</p>
            </div>
            <Button variant="outline" size="sm" onClick={regenerate} className="w-full">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Gerar novo link
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="share-title" className="text-xs text-muted-foreground uppercase tracking-wider">
                Título do relatório
              </Label>
              <Input
                id="share-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resumo semanal — 14/04/2026"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="share-expiry"
                  checked={hasExpiry}
                  onCheckedChange={(v) => setHasExpiry(!!v)}
                />
                <Label htmlFor="share-expiry" className="text-sm cursor-pointer">
                  Definir expiração
                </Label>
              </div>
              {hasExpiry && (
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="metric"
                />
              )}
            </div>

            <Button onClick={generate} disabled={loading || !title.trim()} className="w-full bg-[#0C2340] hover:bg-[#1A3A5C]">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              Gerar link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
