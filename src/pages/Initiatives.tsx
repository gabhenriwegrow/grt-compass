import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORIES, InitiativeStatus, STATUS_META, formatDate } from "@/lib/grt";
import { Plus, Search } from "lucide-react";

type Row = {
  id: string; title: string; category: string; status: InitiativeStatus;
  owner: string | null; due_date: string | null; description: string | null;
};

const Initiatives = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("initiatives")
        .select("id,title,category,status,owner,due_date,description")
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (cat !== "all" && r.category !== cat) return false;
        if (status !== "all" && r.status !== status) return false;
        if (q && !`${r.title} ${r.description ?? ""} ${r.owner ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [rows, q, cat, status]
  );

  return (
    <div className="container py-6 md:py-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Iniciativas</h1>
          <p className="text-sm text-muted-foreground">{rows.length} cadastradas · {filtered.length} filtradas</p>
        </div>
        <Button asChild className="bg-gradient-primary">
          <Link to="/initiatives/new"><Plus className="w-4 h-4 mr-1.5" /> Nova iniciativa</Link>
        </Button>
      </div>

      <Card className="surface-card p-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar título, owner, descrição…" className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="md:w-56"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {(Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <Card className="surface-card p-10 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma iniciativa encontrada.</p>
        </Card>
      ) : (
        <div className="surface-card divide-y divide-border">
          {filtered.map((r) => (
            <Link key={r.id} to={`/initiatives/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>{r.category}</span>
                  {r.owner && <><span>·</span><span>{r.owner}</span></>}
                </div>
                <div className="text-sm font-medium truncate mt-0.5">{r.title}</div>
              </div>
              {r.due_date && <div className="hidden md:block text-xs text-muted-foreground metric whitespace-nowrap">{formatDate(r.due_date)}</div>}
              <StatusBadge status={r.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Initiatives;
