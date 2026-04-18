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

const SYSTEM_BASE =
  "Você é o assistente de estratégia comercial da Bernhoeft GRT. " +
  "O time tem como objetivo único fechar 2026 com R$1.260.000 em novo MRR (R$105.000/mês). " +
  "Gere relatórios executivos concisos em português brasileiro, com tom direto, analítico e útil para o CRO. " +
  "Use markdown com cabeçalhos (##), listas e ênfase. Evite jargões e enrolação.";

const MODEL = "google/gemini-2.5-flash";

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

    if (body.report_type === "weekly_summary") {
      const week = body.week_date ?? mondayOfStr(new Date());
      weekDate = week;
      scope = "all";
      const [{ data: checkins }, { data: initiatives }, { data: objectives }, { data: krs }] =
        await Promise.all([
          supa
            .from("weekly_checkins")
            .select("*, initiatives(title, category, owner, status)")
            .eq("week_date", week)
            .order("created_at", { ascending: true }),
          supa
            .from("initiatives")
            .select("title,category,owner,status,impediment,priority_score"),
          supa.from("objectives").select("*"),
          supa.from("key_results").select("*").order("code"),
        ]);

      systemPrompt +=
        "\n\nVocê está gerando o RELATÓRIO SEMANAL para o CRO. " +
        "Estruture em: ## Visão geral · ## Top avanços · ## Bloqueios · ## Decisões necessárias da liderança · ## Nota de confiança (0-100). " +
        "Seja específico citando nomes de iniciativas e responsáveis. Limite a 500 palavras.";

      userPrompt = JSON.stringify(
        {
          semana: week,
          objetivo: objectives?.[0],
          key_results: krs,
          checkins_da_semana: checkins,
          status_atual_das_iniciativas: initiatives,
        },
        null,
        2
      );
    } else if (body.report_type === "initiative_analysis") {
      if (!body.initiative_id) return json({ error: "initiative_id obrigatório" }, 400);
      scope = body.initiative_id;
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

      systemPrompt +=
        "\n\nVocê está analisando UMA INICIATIVA específica. " +
        "Estruture em: ## Evolução · ## Diagnóstico · ## Riscos · ## Próximos passos recomendados. " +
        "Seja prático e acionável. Limite a 400 palavras.";

      userPrompt = JSON.stringify({ iniciativa: initiative, historico_checkins: checkins }, null, 2);
    } else if (body.report_type === "executive_briefing") {
      scope = "all";
      const [
        { data: objectives },
        { data: krs },
        { data: initiatives },
        { data: recentCheckins },
      ] = await Promise.all([
        supa.from("objectives").select("*"),
        supa.from("key_results").select("*").order("code"),
        supa
          .from("initiatives")
          .select("title,category,owner,status,impediment,priority_score,due_date,description"),
        supa
          .from("weekly_checkins")
          .select("*, initiatives(title)")
          .order("week_date", { ascending: false })
          .limit(50),
      ]);

      systemPrompt +=
        "\n\nVocê está gerando o BRIEFING EXECUTIVO consolidado. " +
        "Estruture em: ## Status do Objetivo (R$1.260.000 MRR 2026) · ## Saúde dos KRs · ## Top 5 avanços · ## Top 5 riscos · ## Recomendações estratégicas. " +
        "Seja sintético e estratégico. Limite a 600 palavras.";

      userPrompt = JSON.stringify(
        {
          objetivo: objectives?.[0],
          key_results: krs,
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
