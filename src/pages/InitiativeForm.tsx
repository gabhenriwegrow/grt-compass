import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, InitiativeStatus, STATUS_META } from "@/lib/grt";
import { StatusIcon } from "@/components/StatusBadge";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

type KROpt = { id: string; code: string; title: string };

const InitiativeForm = () => {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const [krs, setKrs] = useState<KROpt[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Impacto Rápido" as string,
    owner: "Gabriel",
    status: "nao_iniciado" as InitiativeStatus,
    key_result_id: "none",
    effort: "",
    impact: "",
    indicator: "",
    indicator_type: "Projeto" as "Projeto" | "Processo",
    target_value: "",
    current_value: "",
    target_percentage: "",
    due_date: "",
    impediment: "",
    notes: "",
  });

  useEffect(() => {
    supabase.from("key_results").select("id,code,title").order("code").then(({ data }) => setKrs((data ?? []) as KROpt[]));
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("initiatives").select("*").eq("id", id!).maybeSingle();
      if (error || !data) {
        toast.error("Iniciativa não encontrada");
        navigate("/initiatives");
        return;
      }
      setForm({
        title: data.title ?? "",
        description: data.description ?? "",
        category: data.category,
        owner: data.owner ?? "",
        status: data.status as InitiativeStatus,
        key_result_id: data.key_result_id ?? "none",
        effort: data.effort?.toString() ?? "",
        impact: data.impact?.toString() ?? "",
        indicator: data.indicator ?? "",
        indicator_type: (data.indicator_type as any) ?? "Projeto",
        target_value: data.target_value?.toString() ?? "",
        current_value: data.current_value?.toString() ?? "",
        target_percentage: data.target_percentage?.toString() ?? "",
        due_date: data.due_date ?? "",
        impediment: data.impediment ?? "",
        notes: data.notes ?? "",
      });
      setLoading(false);
    })();
  }, [id, isNew, navigate]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const num = (s: string) => (s.trim() === "" ? null : Number(s));
    const int = (s: string) => (s.trim() === "" ? null : parseInt(s, 10));
    const effort = int(form.effort);
    const impact = int(form.impact);
    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category,
      owner: form.owner || null,
      status: form.status,
      key_result_id: form.key_result_id === "none" ? null : form.key_result_id,
      effort,
      impact,
      priority_score: effort && impact ? impact * (6 - effort) : null,
      indicator: form.indicator || null,
      indicator_type: form.indicator_type,
      target_value: num(form.target_value),
      current_value: num(form.current_value),
      target_percentage: num(form.target_percentage),
      due_date: form.due_date || null,
      impediment: form.impediment || null,
      notes: form.notes || null,
    };

    if (isNew) {
      // sequential number per category
      const { count } = await supabase.from("initiatives").select("*", { count: "exact", head: true }).eq("category", form.category);
      const { data, error } = await supabase.from("initiatives").insert({ ...payload, number: (count ?? 0) + 1 }).select("id").maybeSingle();
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Iniciativa criada");
      navigate(`/initiatives/${data!.id}`);
    } else {
      const { error } = await supabase.from("initiatives").update(payload).eq("id", id!);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Salvo");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Excluir esta iniciativa?")) return;
    const { error } = await supabase.from("initiatives").delete().eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    navigate("/initiatives");
  };

  if (loading) return <div className="container py-10 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="container py-6 md:py-10 max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{isNew ? "Nova iniciativa" : "Editar iniciativa"}</h1>
        <p className="text-sm text-muted-foreground">Cadastre o que será feito e como será medido.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="surface-card p-5 space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Implantar cadência de prospecção outbound" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>KR vinculado</Label>
              <Select value={form.key_result_id} onValueChange={(v) => set("key_result_id", v)}>
                <SelectTrigger><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem vínculo</SelectItem>
                  {krs.map((k) => <SelectItem key={k.id} value={k.id}>{k.code} — {k.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <Input value={form.owner} onChange={(e) => set("owner", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as InitiativeStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="inline-flex items-center gap-2"><StatusIcon status={s} className="w-3.5 h-3.5" /> {STATUS_META[s].label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Esforço (1-5)</Label>
                <Input type="number" min={1} max={5} value={form.effort} onChange={(e) => set("effort", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Impacto (1-5)</Label>
                <Input type="number" min={1} max={5} value={form.impact} onChange={(e) => set("impact", e.target.value)} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="surface-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Indicador de sucesso</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.indicator_type} onValueChange={(v) => set("indicator_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Projeto">Projeto</SelectItem>
                  <SelectItem value="Processo">Processo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição do indicador</Label>
              <Input value={form.indicator} onChange={(e) => set("indicator", e.target.value)} placeholder="Ex.: SQLs gerados/mês" />
            </div>
            <div className="space-y-2">
              <Label>Valor alvo</Label>
              <Input type="number" step="any" value={form.target_value} onChange={(e) => set("target_value", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor atual</Label>
              <Input type="number" step="any" value={form.current_value} onChange={(e) => set("current_value", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>% alvo</Label>
              <Input type="number" step="any" value={form.target_percentage} onChange={(e) => set("target_percentage", e.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="surface-card p-5 space-y-4">
          <div className="space-y-2">
            <Label>Impedimento atual</Label>
            <Textarea rows={2} value={form.impediment} onChange={(e) => set("impediment", e.target.value)} placeholder="Algo bloqueando esta iniciativa?" />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {!isNew && (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Excluir
              </Button>
            )}
          </div>
          <Button type="submit" disabled={saving} className="bg-[#0C2340] hover:bg-[#1A3A5C]">
            <Save className="w-4 h-4 mr-1.5" /> {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InitiativeForm;
