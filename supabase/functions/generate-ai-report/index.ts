import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ReportType = "weekly_summary" | "initiative_analysis" | "executive_briefing";

interface Body {
  report_type: ReportType;
  week_date?: string;       // for weekly_summary
  initiative_id?: string;   // for initiative_analysis
}

const SYSTEM_BASE = `Você é o analista de estratégia comercial da Bernhoeft GRT. Você conhece profundamente a operação e gera relatórios executivos para o CRO (Bruno) e o Gerente Comercial (Gabriel).

## Sobre a empresa
Bernhoeft GRT (Gestão de Riscos com Terceiros) é uma consultoria B2B com 800+ funcionários e 180+ clientes enterprise. O serviço principal é gestão de riscos com terceiros — due diligence, compliance e monitoramento de fornecedores para grandes corporações brasileiras.

## Objetivo comercial 2026
Meta única: R$1.260.000 em novo MRR no ano (R$105.000/mês). Todo o trabalho do time comercial existe para atingir esse número.

## Estrutura do time comercial (12 pessoas)
- Gabriel Henriques — Gerente Comercial, lidera o time, reporta ao Bruno
- Isabela — Coordenadora Comercial, braço direito do Gabriel
- Elisvan — Closer Sênior (maior carteira: 46 deals, 63.5% win rate, R$14.7M won)
- Yasmim — Closer Sênior (23 deals, 34.7% win rate — tem gaps críticos de conversão)
- Emanoel — Closer Sênior (9 deals, 53.2% win rate, maior ticket médio via VLI)
- José Guilherme — Farmer
- Erlon — Farmer
- Gabriel Carvalho — SDR
- Ana Sales — Staff
- Leilane — Piloto
- Jéssica — Piloto
- Miguel — Apoio
- José Lucas — Sales Ops

## Iniciativas estratégicas ativas
O time opera 33 iniciativas divididas em 7 categorias:
- Impacto Rápido (4): retomada de 600+ leads, sequências pós-reunião, precificação ao vivo, SLA de emails
- Impacto Médio Prazo (4): retomada de concorrências perdidas, LinkedIn como canal, tracking de ligações, programa de indicação
- Impacto Estrutural (4): base de 100k contatos, centralizar BIDs/RFPs, IA na rotina, eventos presenciais
- OKR Q2 (11): reuniões CALC, 150 Maiores, leads perdidos, Mesas Redondas, Helper, CRM, discurso comercial, materiais, playbook, reconhecimento
- Automações Growth (10): WhatsApp no HubSpot, resumo de reunião, emails automáticos, SDR com IA, motores de precificação, RAG para BIDs

## Projeto 150 Maiores
Iniciativa central: mapear as 150 maiores empresas do Brasil como prospects. Status atual: 43 são clientes Bernhoeft confirmados. Deals ativos distribuídos entre Elisvan (46), Yasmim (23), Emanoel (9), Guilherme (11). Aproximadamente 30 empresas ainda sem closer atribuído.

## Concorrentes
- WeHandle: 41 clientes confirmados (Eurofarma, M. Dias Branco, Unimed Fortaleza, Scala Data Center entre os mais recentes)
- Atlas Inovações: 27+ clientes confirmados (Brametal, Rumo, PUC, Auren Energia)
- Ambos têm churn alto na implantação — oportunidade de retomada

## Contexto operacional
- O time veio de 2025 com execução reativa (eventos sem estratégia, sem sequências, sem tracking)
- 2026 é o ano de transformação: processos, automação, IA e disciplina operacional
- HubSpot é o CRM central. MeetRox está em POC para gravação e análise de reuniões
- Gabriel está implementando automações com Power Automate, Claude API e Python

## Como gerar relatórios
- Seja direto, use dados concretos dos check-ins, não enrole
- Português brasileiro, frases curtas, tom executivo
- Sempre conecte o progresso das iniciativas ao impacto no objetivo de R$105k/mês
- Quando identificar risco, diga exatamente qual iniciativa, quem é o responsável e o que deveria acontecer
- Quando algo está indo bem, reconheça com dados (não elogie de forma genérica)
- Dê uma nota de confiança de 0 a 100 sobre a probabilidade de atingir a meta do mês corrente
- Termine com "Top 3 ações para esta semana" — concretas, com responsável`;

const INITIATIVE_ANALYSIS_BLOCK = `

Você está analisando uma iniciativa específica. Sua análise deve ter 3 seções:

## Evolução
Descreva como a iniciativa progrediu com base nos check-ins. Use datas e fatos concretos. Se não houve progresso, diga claramente.

## Diagnóstico
Explique por que a iniciativa está no estado atual. Considere: impedimentos registrados, frequência de check-ins, dependências com outras iniciativas, capacidade do responsável (quantas outras iniciativas essa pessoa tem?).

## Recomendações
Liste 3 ações concretas e específicas com responsável e prazo sugerido. Não dê conselhos genéricos como "alinhar com o time" — diga exatamente o que fazer, quem faz e quando.`;

const EXECUTIVE_BRIEFING_BLOCK = `

Gere um briefing executivo para o Bruno (CRO). Estrutura obrigatória:

## Visão Geral
Uma frase sobre o estado do objetivo. MRR acumulado vs meta. Confiança.

## KRs — Status
Para cada KR (COM-01, COM-02, COM-03): quantas iniciativas concluídas do total, health, o que mais avançou e o que mais preocupa.

## Top 5 Avanços da Semana
Lista com nome da iniciativa, o que aconteceu e impacto esperado.

## Top 5 Riscos Ativos
Lista com nome da iniciativa, motivo do risco, responsável e há quantos dias está nesse estado.

## Decisões que Precisam do CRO
Se alguma iniciativa precisa de decisão ou recurso que só o Bruno pode desbloquear, listar aqui com contexto.

## Score de Confiança
Nota de 0 a 100 com justificativa em uma frase.`;

const MODEL = "google/gemini-2.5-flash";

function countByStatus(initiatives: any[] | null) {
  const counts: Record<string, number> = {
    concluido: 0,
    em_andamento: 0,
    bloqueado: 0,
    nao_iniciado: 0,
    pausado: 0,
  };
  (initiatives ?? []).forEach((i) => {
    counts[i.status] = (counts[i.status] ?? 0) + 1;
  });
  return counts;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.report_type) {
      return json({ error: "report_type obrigatório" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);

    let systemPrompt = SYSTEM_BASE;
    let userPrompt = "";
    let scope = "all";
    let weekDate: string | null = null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (body.report_type === "weekly_summary") {
      const week = body.week_date ?? mondayOfStr(new Date());
      weekDate = week;
      scope = "all";
      const [
        { data: checkins },
        { data: initiatives },
        { data: objectives },
        { data: krs },
        { data: mrr },
      ] = await Promise.all([
        supa
          .from("weekly_checkins")
          .select("*, initiatives(title, category, owner, status)")
          .eq("week_date", week)
          .order("created_at", { ascending: true }),
        supa
          .from("initiatives")
          .select("title,category,owner,status,impediment,priority_score,key_result_id"),
        supa.from("objectives").select("*"),
        supa.from("key_results").select("*").order("code"),
        supa.from("monthly_mrr").select("*").eq("year", currentYear).order("month"),
      ]);

      const accumulatedMrr = (mrr ?? []).reduce((s, m: any) => s + Number(m.realized_value ?? 0), 0);
      const currentMonthMrr = (mrr ?? []).find((m: any) => m.month === currentMonth)?.realized_value ?? 0;
      const targetAccumulated = 105000 * currentMonth;
      const statusCounts = countByStatus(initiatives);

      userPrompt = JSON.stringify(
        {
          semana_referencia: week,
          objetivo: objectives?.[0],
          mrr: {
            ano: currentYear,
            acumulado_realizado: accumulatedMrr,
            meta_acumulada_proporcional: targetAccumulated,
            mes_corrente: currentMonth,
            mrr_mes_corrente: currentMonthMrr,
            historico_mensal: mrr,
          },
          key_results: krs,
          contagem_iniciativas_por_status: statusCounts,
          total_iniciativas: initiatives?.length ?? 0,
          checkins_da_semana: checkins,
          status_atual_de_TODAS_as_iniciativas: initiatives,
        },
        null,
        2
      );
    } else if (body.report_type === "initiative_analysis") {
      if (!body.initiative_id) return json({ error: "initiative_id obrigatório" }, 400);
      scope = body.initiative_id;
      systemPrompt += INITIATIVE_ANALYSIS_BLOCK;

      const [{ data: initiative }, { data: checkins }] = await Promise.all([
        supa
          .from("initiatives")
          .select("*, key_results(code,title)")
          .eq("id", body.initiative_id)
          .maybeSingle(),
        supa
          .from("weekly_checkins")
          .select("*")
          .eq("initiative_id", body.initiative_id)
          .order("week_date", { ascending: true }),
      ]);
      if (!initiative) return json({ error: "Iniciativa não encontrada" }, 404);

      // Carga do owner + cluster da categoria
      const [{ data: ownerInitiatives }, { data: categoryInitiatives }] = await Promise.all([
        initiative.owner
          ? supa
              .from("initiatives")
              .select("title,status,category")
              .eq("owner", initiative.owner)
          : Promise.resolve({ data: [] as any[] }),
        supa
          .from("initiatives")
          .select("title,status,owner")
          .eq("category", initiative.category),
      ]);

      userPrompt = JSON.stringify(
        {
          iniciativa: initiative,
          historico_checkins: checkins,
          carga_do_responsavel: {
            owner: initiative.owner,
            total_iniciativas: ownerInitiatives?.length ?? 0,
            por_status: countByStatus(ownerInitiatives),
            lista: ownerInitiatives,
          },
          cluster_categoria: {
            categoria: initiative.category,
            total: categoryInitiatives?.length ?? 0,
            por_status: countByStatus(categoryInitiatives),
            outras_iniciativas: categoryInitiatives?.filter((c: any) => c.title !== initiative.title),
          },
        },
        null,
        2
      );
    } else if (body.report_type === "executive_briefing") {
      scope = "all";
      systemPrompt += EXECUTIVE_BRIEFING_BLOCK;

      const [
        { data: objectives },
        { data: krs },
        { data: initiatives },
        { data: recentCheckins },
        { data: mrr },
      ] = await Promise.all([
        supa.from("objectives").select("*"),
        supa.from("key_results").select("*").order("code"),
        supa
          .from("initiatives")
          .select("id,title,category,owner,status,impediment,priority_score,due_date,description,key_result_id,updated_at"),
        supa
          .from("weekly_checkins")
          .select("*, initiatives(title,owner,category)")
          .order("week_date", { ascending: false })
          .limit(50),
        supa.from("monthly_mrr").select("*").eq("year", currentYear).order("month"),
      ]);

      const accumulatedMrr = (mrr ?? []).reduce((s, m: any) => s + Number(m.realized_value ?? 0), 0);
      const currentMonthMrr = (mrr ?? []).find((m: any) => m.month === currentMonth)?.realized_value ?? 0;
      const targetAccumulated = 105000 * currentMonth;
      const statusCounts = countByStatus(initiatives);

      // KR breakdown
      const krBreakdown = (krs ?? []).map((kr: any) => {
        const linked = (initiatives ?? []).filter((i: any) => i.key_result_id === kr.id);
        const concluidas = linked.filter((i: any) => i.status === "concluido").length;
        return {
          code: kr.code,
          title: kr.title,
          health: kr.health,
          owner: kr.owner,
          total_iniciativas: linked.length,
          concluidas,
          em_andamento: linked.filter((i: any) => i.status === "em_andamento").length,
          bloqueadas: linked.filter((i: any) => i.status === "bloqueado").length,
          nao_iniciadas: linked.filter((i: any) => i.status === "nao_iniciado").length,
          iniciativas: linked.map((i: any) => ({ title: i.title, status: i.status, owner: i.owner })),
        };
      });

      const impedimentos = (initiatives ?? []).filter((i: any) => i.impediment && i.impediment.trim());

      userPrompt = JSON.stringify(
        {
          objetivo: objectives?.[0],
          mrr: {
            ano: currentYear,
            acumulado_realizado: accumulatedMrr,
            meta_acumulada_proporcional: targetAccumulated,
            mes_corrente: currentMonth,
            mrr_mes_corrente: currentMonthMrr,
            historico_mensal: mrr,
          },
          key_results_detalhados: krBreakdown,
          contagem_iniciativas_por_status: statusCounts,
          total_iniciativas: initiatives?.length ?? 0,
          impedimentos_ativos: impedimentos,
          iniciativas: initiatives,
          checkins_recentes: recentCheckins,
        },
        null,
        2
      );
    } else {
      return json({ error: "report_type inválido" }, 400);
    }

    // Call Lovable AI
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      if (aiRes.status === 429)
        return json({ error: "Limite de requisições atingido. Tente novamente em instantes." }, 429);
      if (aiRes.status === 402)
        return json({ error: "Créditos esgotados. Adicione créditos no workspace." }, 402);
      return json({ error: "Falha ao chamar IA" }, 500);
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    if (!content) return json({ error: "Resposta vazia da IA" }, 500);

    const { data: saved, error: insErr } = await supa
      .from("ai_reports")
      .insert({
        report_type: body.report_type,
        scope,
        content,
        week_date: weekDate,
      })
      .select()
      .single();

    if (insErr) {
      console.error("Insert error:", insErr);
      return json({ error: insErr.message }, 500);
    }

    return json({ report: saved });
  } catch (e) {
    console.error("generate-ai-report error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mondayOfStr(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}
