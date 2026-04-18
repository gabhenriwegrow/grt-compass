import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { StatusSparkline } from "@/components/StatusSparkline";
import { CATEGORIES, InitiativeStatus, STATUS_META, formatDate, daysBetween, computeTrend, TREND_META } from "@/lib/grt";
import { Plus, Search, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  id: string; number: number; title: string; category: string; status: InitiativeStatus;
  owner: string | null; due_date: string | null; description: string | null;
  impediment: string | null; key_result_id: string | null;
};
type KR = { id: string; code: string };

const Initiatives = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [krs, setKrs] = useState<KR[]>([]);
  const [lastCheckinByInit, setLastCheckinByInit] = useState<Record<string, string>>({});
  const [checkinsByInit, setCheckinsByInit] = useState<Record<string, Array<{ week_date: string; status_snapshot: string }>>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string[]>([]);
  const [catF, setCatF] = useState<string[]>([]);
  const [ownerF, setOwnerF] = useState<string[]>([]);
  const [krF, setKrF] = useState<string[]>([]);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const [iRes, kRes, cRes] = await Promise.all([
        supabase.from("initiatives").select("id,number,title,category,status,owner,due_date,description,impediment,key_result_id").order("number"),
        supabase.from("key_results").select("id,code").order("code"),
        supabase.from("weekly_checkins").select("initiative_id, week_date, status_snapshot, created_at").order("week_date", { ascending: true }),
      ]);
      setRows((iRes.data ?? []) as Row[]);
      setKrs((kRes.data ?? []) as KR[]);
      // Build per-initiative history (dedupe per week, keep latest by created_at)
      const histMap: Record<string, Map<string, { week_date: string; status_snapshot: string; created_at: string }>> = {};
      for (const c of (cRes.data ?? []) as any[]) {
        const m = (histMap[c.initiative_id] ??= new Map());
        const existing = m.get(c.week_date);
        if (!existing || existing.created_at < c.created_at) {
          m.set(c.week_date, { week_date: c.week_date, status_snapshot: c.status_snapshot, created_at: c.created_at });
        }
      }
      const lastMap: Record<string, string> = {};
      const histOut: Record<string, Array<{ week_date: string; status_snapshot: string }>> = {};
      for (const [initId, m] of Object.entries(histMap)) {
        const arr = Array.from(m.values()).sort((a, b) => a.week_date.localeCompare(b.week_date));
        histOut[initId] = arr.map(({ week_date, status_snapshot }) => ({ week_date, status_snapshot }));
        lastMap[initId] = arr[arr.length - 1].week_date;
      }
      setLastCheckinByInit(lastMap);
      setCheckinsByInit(histOut);
      // Default: open all categories
      setOpenCats(Object.fromEntries(CATEGORIES.map((c) => [c, true])));
      setLoading(false);
    })();
  }, []);

  const krCodeById = useMemo(() => Object.fromEntries(krs.map((k) => [k.id, k.code])), [krs]);
  const owners = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.owner && s.add(r.owner));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (catF.length && !catF.includes(r.category)) return false;
        if (statusF.length && !statusF.includes(r.status)) return false;
        if (ownerF.length && !ownerF.includes(r.owner ?? "")) return false;
        if (krF.length) {
          const kr = r.key_result_id ? krCodeById[r.key_result_id] : "__none__";
          if (!krF.includes(kr ?? "__none__")) return false;
        }
        if (q && !`${r.title} ${r.description ?? ""} ${r.owner ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [rows, q, catF, statusF, ownerF, krF, krCodeById]
  );

  const groupedByCat = useMemo(() => {
    const g: Record<string, Row[]> = {};
    for (const cat of CATEGORIES) g[cat] = [];
    for (const r of filtered) (g[r.category] ??= []).push(r);
    Object.values(g).forEach((arr) => arr.sort((a, b) => a.number - b.number));
    return g;
  }, [filtered]);

  const clearFilters = () => { setStatusF([]); setCatF([]); setOwnerF([]); setKrF([]); setQ(""); };
  const hasFilters = statusF.length + catF.length + ownerF.length + krF.length > 0 || q.length > 0;

  const krOptions = [{ value: "__none__", label: "Sem KR" }, ...krs.map((k) => ({ value: k.code, label: k.code }))];

  return (
    <div className="container py-6 md:py-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Iniciativas</h1>
          <p className="text-sm text-muted-foreground">
            Exibindo <span className="metric text-foreground font-semibold">{filtered.length}</span> de {rows.length} iniciativas
          </p>
        </div>
        <Button asChild className="bg-gradient-primary">
          <Link to="/initiatives/new"><Plus className="w-4 h-4 mr-1.5" /> Nova iniciativa</Link>
        </Button>
      </div>

      <Card className="surface-card p-3 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar título, owner, descrição…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <MultiSelectFilter
            label="Status"
            options={(Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label }))}
            selected={statusF}
            onChange={setStatusF}
          />
          <MultiSelectFilter
            label="Categoria"
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            selected={catF}
            onChange={setCatF}
          />
          <MultiSelectFilter
            label="Owner"
            options={owners.map((o) => ({ value: o, label: o }))}
            selected={ownerF}
            onChange={setOwnerF}
          />
          <MultiSelectFilter
            label="KR"
            options={krOptions}
            selected={krF}
            onChange={setKrF}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-3.5 h-3.5 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <Card className="surface-card p-10 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma iniciativa encontrada com os filtros atuais.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const list = groupedByCat[cat];
            if (!list.length) return null;
            const isOpen = openCats[cat] ?? true;
            const statusCounts = (Object.keys(STATUS_META) as InitiativeStatus[]).map((s) => ({
              s, n: list.filter((r) => r.status === s).length,
            })).filter((x) => x.n > 0);
            return (
              <Collapsible
                key={cat}
                open={isOpen}
                onOpenChange={(o) => setOpenCats((p) => ({ ...p, [cat]: o }))}
                className="surface-card overflow-hidden"
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <ChevronDown className={cn("w-4 h-4 transition-transform shrink-0", !isOpen && "-rotate-90")} />
                    <CategoryBadge category={cat} />
                    <span className="text-xs text-muted-foreground metric">{list.length} iniciativas</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {statusCounts.map(({ s, n }) => (
                      <span key={s} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary/40 border border-border">
                        <span className={`status-dot ${STATUS_META[s].dot}`} />
                        <span className="metric font-semibold">{n}</span>
                      </span>
                    ))}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="divide-y divide-border border-t border-border">
                    {list.map((r) => {
                      const lastCk = lastCheckinByInit[r.id];
                      const kr = r.key_result_id ? krCodeById[r.key_result_id] : null;
                      const hist = checkinsByInit[r.id] ?? [];
                      const trend = computeTrend(hist);
                      const tMeta = TREND_META[trend];
                      return (
                        <Link key={r.id} to={`/initiatives/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                          <div className="metric text-xs text-muted-foreground w-8 shrink-0">#{r.number}</div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{r.title}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                              {r.owner && <span>{r.owner}</span>}
                              {kr && <span className="metric text-primary font-semibold">{kr}</span>}
                              <span className={cn(lastCk ? "text-muted-foreground" : "text-destructive font-semibold")}>
                                {lastCk ? `Último check-in: ${formatDate(lastCk)} (${daysBetween(lastCk)}d)` : "Sem check-ins"}
                              </span>
                            </div>
                            {r.impediment && <div className="text-xs text-destructive mt-1">⚠ {r.impediment}</div>}
                          </div>
                          <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
                            <StatusSparkline checkins={hist} currentStatus={r.status} width={120} height={20} />
                            <span className={cn("text-[10px] font-medium metric", tMeta.color)}>
                              {tMeta.icon} {tMeta.label}
                            </span>
                          </div>
                          <StatusBadge status={r.status} />
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Initiatives;
