import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MONTH_NAMES_PT_FULL, formatBRL, parseBRNumber } from "@/lib/grt";
import { Download, Plus, Save } from "lucide-react";
import { toast } from "sonner";

type Objective = { id: string; statement: string; target_annual: number; target_monthly: number; timeframe: string; confidence: number };
type KR = { id: string; code: string; title: string; owner: string | null };
type MonthlyMrr = { id: string; month: number; year: number; realized_value: number };
type Initiative = any;

const Config = () => {
  const [obj, setObj] = useState<Objective | null>(null);
  const [krs, setKrs] = useState<KR[]>([]);
  const [mrr, setMrr] = useState<MonthlyMrr[]>([]);
  const [loading, setLoading] = useState(true);
  const [mrrInputs, setMrrInputs] = useState<Record<number, string>>({});

  const load = async () => {
    const [oRes, kRes, mRes] = await Promise.all([
      supabase.from("objectives").select("*").limit(1).maybeSingle(),
      supabase.from("key_results").select("id,code,title,owner").order("code"),
      supabase.from("monthly_mrr").select("*").eq("year", 2026).order("month"),
    ]);
    setObj(oRes.data as Objective | null);
    setKrs((kRes.data ?? []) as KR[]);
    const mrrList = (mRes.data ?? []) as MonthlyMrr[];
    setMrr(mrrList);
    setMrrInputs(Object.fromEntries(mrrList.map((m) => [m.month, String(m.realized_value)])));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveObjective = async () => {
    if (!obj) return;
    const { error } = await supabase.from("objectives").update({
      statement: obj.statement,
      target_annual: obj.target_annual,
      target_monthly: obj.target_monthly,
      timeframe: obj.timeframe,
      confidence: obj.confidence,
    }).eq("id", obj.id);
    if (error) return toast.error(error.message);
    toast.success("Objetivo atualizado");
  };

  const saveKr = async (kr: KR) => {
    const { error } = await supabase.from("key_results").update({ title: kr.title, owner: kr.owner }).eq("id", kr.id);
    if (error) return toast.error(error.message);
    toast.success(`${kr.code} atualizado`);
  };

  const saveAllMrr = async () => {
    const updates = mrr.map((m) => {
      const v = parseBRNumber(mrrInputs[m.month] ?? "0");
      return supabase.from("monthly_mrr").update({ realized_value: v }).eq("id", m.id);
    });
    await Promise.all(updates);
    toast.success("MRR mensal atualizado");
    load();
  };

  const exportCsv = async () => {
    const { data } = await supabase.from("initiatives").select("*").order("number");
    const initiatives = (data ?? []) as Initiative[];
    const { data: krs2 } = await supabase.from("key_results").select("id, code");
    const krMap = Object.fromEntries((krs2 ?? []).map((k: any) => [k.id, k.code]));
    const headers = [
      "number","category","title","description","owner","status","key_result_code",
      "indicator","indicator_type","target_value","current_value","effort","impact",
      "priority_score","impediment","notes",
    ];
    const escape = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const lines = [headers.join(",")];
    for (const i of initiatives) {
      lines.push([
        i.number, i.category, i.title, i.description, i.owner, i.status,
        i.key_result_id ? krMap[i.key_result_id] ?? "" : "",
        i.indicator, i.indicator_type, i.target_value, i.current_value,
        i.effort, i.impact, i.priority_score, i.impediment, i.notes,
      ].map(escape).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iniciativas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${initiatives.length} iniciativas exportadas`);
  };

  const totalMrr = useMemo(() => Object.values(mrrInputs).reduce((s, v) => s + parseBRNumber(v), 0), [mrrInputs]);

  if (loading) return <div className="container py-10 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="container py-6 md:py-10 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Edite o objetivo, KRs, MRR mensal e exporte dados.</p>
      </div>

      <Tabs defaultValue="objective">
        <TabsList>
          <TabsTrigger value="objective">Objetivo</TabsTrigger>
          <TabsTrigger value="krs">Key Results</TabsTrigger>
          <TabsTrigger value="mrr">MRR Mensal</TabsTrigger>
          <TabsTrigger value="data">Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="objective" className="mt-4">
          {obj && (
            <Card className="surface-card p-5 space-y-4">
              <div className="space-y-2">
                <Label>Statement do objetivo</Label>
                <Textarea rows={3} value={obj.statement} onChange={(e) => setObj({ ...obj, statement: e.target.value })} />
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Meta anual (R$)</Label>
                  <Input type="number" value={obj.target_annual} onChange={(e) => setObj({ ...obj, target_annual: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Meta mensal (R$)</Label>
                  <Input type="number" value={obj.target_monthly} onChange={(e) => setObj({ ...obj, target_monthly: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <Input value={obj.timeframe} onChange={(e) => setObj({ ...obj, timeframe: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Confiança (%)</Label>
                  <Input type="number" min={0} max={100} value={obj.confidence} onChange={(e) => setObj({ ...obj, confidence: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveObjective} className="bg-gradient-primary"><Save className="w-4 h-4 mr-1.5" /> Salvar</Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="krs" className="mt-4 space-y-3">
          {krs.map((kr) => (
            <Card key={kr.id} className="surface-card p-5 space-y-3">
              <div className="text-[10px] font-mono text-primary tracking-widest uppercase">{kr.code}</div>
              <div className="grid md:grid-cols-[1fr_200px] gap-3">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={kr.title} onChange={(e) => setKrs((prev) => prev.map((k) => k.id === kr.id ? { ...k, title: e.target.value } : k))} />
                </div>
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Input value={kr.owner ?? ""} onChange={(e) => setKrs((prev) => prev.map((k) => k.id === kr.id ? { ...k, owner: e.target.value } : k))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => saveKr(kr)}>Salvar</Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="mrr" className="mt-4">
          <Card className="surface-card p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">MRR realizado por mês — 2026</h3>
                <p className="text-xs text-muted-foreground">Use vírgula para decimais (ex: 105000,00)</p>
              </div>
              <div className="text-xs text-muted-foreground">Total: <span className="metric font-bold text-foreground">{formatBRL(totalMrr)}</span></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MONTH_NAMES_PT_FULL.map((name, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Label className="w-24 text-xs">{name}</Label>
                  <Input
                    value={mrrInputs[idx + 1] ?? ""}
                    onChange={(e) => setMrrInputs((p) => ({ ...p, [idx + 1]: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={saveAllMrr} className="bg-gradient-primary"><Save className="w-4 h-4 mr-1.5" /> Salvar tudo</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-3">
          <Card className="surface-card p-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold">Adicionar nova iniciativa</h3>
              <p className="text-xs text-muted-foreground">Formulário completo em página dedicada.</p>
            </div>
            <Button asChild className="bg-gradient-primary">
              <Link to="/initiatives/new"><Plus className="w-4 h-4 mr-1.5" /> Nova iniciativa</Link>
            </Button>
          </Card>
          <Card className="surface-card p-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold">Exportar todas as iniciativas</h3>
              <p className="text-xs text-muted-foreground">CSV no mesmo formato do importador.</p>
            </div>
            <Button onClick={exportCsv} variant="outline"><Download className="w-4 h-4 mr-1.5" /> Exportar CSV</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Config;
