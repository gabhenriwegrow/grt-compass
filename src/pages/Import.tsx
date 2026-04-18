import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORIES, InitiativeStatus, STATUS_META } from "@/lib/grt";
import { toast } from "sonner";
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const VALID_STATUSES: InitiativeStatus[] = ["concluido", "em_andamento", "bloqueado", "nao_iniciado", "pausado"];
const VALID_CATEGORIES = CATEGORIES as readonly string[];

type CsvRow = {
  number?: string;
  category?: string;
  title?: string;
  description?: string;
  owner?: string;
  status?: string;
  key_result_code?: string;
  indicator?: string;
  indicator_type?: string;
  target_value?: string;
  current_value?: string;
  effort?: string;
  impact?: string;
  priority_score?: string;
  impediment?: string;
  notes?: string;
};

type ParsedRow = {
  raw: CsvRow;
  number: number | null;
  category: string;
  title: string;
  description: string | null;
  owner: string;
  status: InitiativeStatus | string;
  key_result_code: string | null;
  indicator: string | null;
  indicator_type: string | null;
  target_value: number | null;
  current_value: number | null;
  effort: number | null;
  impact: number | null;
  priority_score: number | null;
  impediment: string | null;
  notes: string | null;
  errors: string[];
};

const toNum = (v: string | undefined): number | null => {
  if (v == null || v.trim() === "") return null;
  const cleaned = v.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
};

const toInt = (v: string | undefined): number | null => {
  const n = toNum(v);
  return n == null ? null : Math.round(n);
};

const str = (v: string | undefined): string | null => {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const validateRow = (r: Omit<ParsedRow, "errors">): string[] => {
  const errs: string[] = [];
  if (!r.title || r.title.trim() === "") errs.push("title");
  if (!r.category || r.category.trim() === "") errs.push("category");
  else if (!VALID_CATEGORIES.includes(r.category)) errs.push(`category inválida: "${r.category}"`);
  if (!r.owner || r.owner.trim() === "") errs.push("owner");
  if (!r.status || (r.status as string).trim() === "") errs.push("status");
  else if (!VALID_STATUSES.includes(r.status as InitiativeStatus)) errs.push(`status inválido: "${r.status}"`);
  return errs;
};

const Import = () => {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Envie um arquivo .csv");
      return;
    }
    setFile(f);
    setResult(null);
    Papa.parse<CsvRow>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const parsed: ParsedRow[] = res.data.map((raw) => {
          const base = {
            raw,
            number: toInt(raw.number),
            category: (raw.category ?? "").trim(),
            title: (raw.title ?? "").trim(),
            description: str(raw.description),
            owner: (raw.owner ?? "").trim(),
            status: (raw.status ?? "").trim(),
            key_result_code: str(raw.key_result_code),
            indicator: str(raw.indicator),
            indicator_type: str(raw.indicator_type),
            target_value: toNum(raw.target_value),
            current_value: toNum(raw.current_value),
            effort: toInt(raw.effort),
            impact: toInt(raw.impact),
            priority_score: toInt(raw.priority_score),
            impediment: str(raw.impediment),
            notes: str(raw.notes),
          };
          return { ...base, errors: validateRow(base) };
        });
        setRows(parsed);
        toast.success(`${parsed.length} linhas parseadas`);
      },
      error: (err) => {
        toast.error(`Erro ao parsear: ${err.message}`);
      },
    });
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const reset = () => {
    setFile(null);
    setRows([]);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => r.errors.length === 0);
    if (valid.length === 0) return toast.error("Nenhuma linha válida para importar");

    setImporting(true);
    setResult(null);

    // Fetch key_results map: code -> id
    const codes = Array.from(new Set(valid.map((r) => r.key_result_code).filter(Boolean) as string[]));
    const krMap = new Map<string, string>();
    if (codes.length > 0) {
      const { data: krs, error: krErr } = await supabase
        .from("key_results")
        .select("id, code")
        .in("code", codes);
      if (krErr) {
        setImporting(false);
        return toast.error(`Erro ao buscar key results: ${krErr.message}`);
      }
      krs?.forEach((k) => krMap.set(k.code, k.id));
    }

    // Compute next number per category for rows missing number
    const categoryCounters = new Map<string, number>();
    const cats = Array.from(new Set(valid.map((r) => r.category)));
    for (const cat of cats) {
      const { count } = await supabase
        .from("initiatives")
        .select("*", { count: "exact", head: true })
        .eq("category", cat);
      categoryCounters.set(cat, count ?? 0);
    }

    const payload = valid.map((r) => {
      let num = r.number;
      if (num == null) {
        const next = (categoryCounters.get(r.category) ?? 0) + 1;
        categoryCounters.set(r.category, next);
        num = next;
      }
      return {
        number: num,
        category: r.category,
        title: r.title,
        description: r.description,
        owner: r.owner,
        status: r.status,
        key_result_id: r.key_result_code ? krMap.get(r.key_result_code) ?? null : null,
        indicator: r.indicator,
        indicator_type: r.indicator_type,
        target_value: r.target_value,
        current_value: r.current_value,
        effort: r.effort,
        impact: r.impact,
        priority_score: r.priority_score ?? (r.impact && r.effort ? r.impact * (6 - r.effort) : null),
        impediment: r.impediment,
        notes: r.notes,
      };
    });

    const { error, count } = await supabase
      .from("initiatives")
      .insert(payload, { count: "exact" });
    setImporting(false);

    if (error) {
      setResult({ success: 0, failed: payload.length });
      return toast.error(`Erro: ${error.message}`);
    }
    const success = count ?? payload.length;
    const failed = rows.length - success;
    setResult({ success, failed });
    toast.success(`${success} iniciativas importadas`);
  };

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const errorCount = rows.length - validCount;

  return (
    <div className="container py-6 md:py-10 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar iniciativas via CSV</h1>
        <p className="text-sm text-muted-foreground">
          Faça upload de um arquivo .csv com as colunas esperadas. Pré-visualize e confirme.
        </p>
      </div>

      {!file && (
        <Card
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "surface-card p-12 border-2 border-dashed cursor-pointer transition-colors text-center",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Arraste um arquivo CSV aqui</p>
              <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Colunas: number, category, title, description, owner, status, key_result_code, indicator, indicator_type, target_value, current_value, effort, impact, priority_score, impediment, notes
            </p>
          </div>
        </Card>
      )}

      {file && (
        <Card className="surface-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · {rows.length} linhas</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="w-4 h-4 mr-1" /> Trocar arquivo
          </Button>
        </Card>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="secondary" className="font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-success" />
                {validCount} prontas para importar
              </Badge>
              {errorCount > 0 && (
                <Badge variant="secondary" className="font-mono">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-destructive" />
                  {errorCount} com erro
                </Badge>
              )}
            </div>
            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="bg-[#0C2340] hover:bg-[#1A3A5C]"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {importing ? "Importando…" : `Confirmar importação (${validCount})`}
            </Button>
          </div>

          {result && (
            <Card className={cn(
              "surface-card p-4 flex items-center gap-3",
              result.failed === 0 ? "border-success/40" : "border-destructive/40"
            )}>
              {result.failed === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              <p className="text-sm">
                <span className="font-semibold text-success">{result.success}</span> importadas com sucesso
                {result.failed > 0 && (
                  <> · <span className="font-semibold text-destructive">{result.failed}</span> falharam</>
                )}
              </p>
            </Card>
          )}

          <Card className="surface-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/30 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left">#</th>
                    <th className="px-3 py-2.5 text-left">Categoria</th>
                    <th className="px-3 py-2.5 text-left">Título</th>
                    <th className="px-3 py-2.5 text-left">Owner</th>
                    <th className="px-3 py-2.5 text-left">Status</th>
                    <th className="px-3 py-2.5 text-left">KR</th>
                    <th className="px-3 py-2.5 text-left">E×I</th>
                    <th className="px-3 py-2.5 text-left">Erros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, idx) => {
                    const hasError = r.errors.length > 0;
                    const isValidStatus = VALID_STATUSES.includes(r.status as InitiativeStatus);
                    return (
                      <tr
                        key={idx}
                        className={cn(
                          "transition-colors",
                          hasError ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-secondary/30"
                        )}
                      >
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.number ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-xs font-normal">
                            {r.category || <span className="text-destructive">vazia</span>}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 max-w-[280px]">
                          <div className="truncate font-medium">{r.title || <span className="text-destructive">vazio</span>}</div>
                          {r.description && (
                            <div className="truncate text-xs text-muted-foreground">{r.description}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">{r.owner || <span className="text-destructive text-xs">vazio</span>}</td>
                        <td className="px-3 py-2.5">
                          {isValidStatus ? (
                            <StatusBadge status={r.status as InitiativeStatus} />
                          ) : (
                            <Badge variant="outline" className="text-destructive border-destructive/40 text-xs">
                              {r.status || "vazio"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{r.key_result_code ?? "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                          {r.effort ?? "—"}×{r.impact ?? "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          {hasError && (
                            <span className="text-xs text-destructive">{r.errors.join(", ")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Import;
