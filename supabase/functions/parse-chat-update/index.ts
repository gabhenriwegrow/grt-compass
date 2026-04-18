const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InitiativeRef {
  id: string;
  title: string;
  category: string;
  status: string;
  number: number;
  owner?: string | null;
  impediment?: string | null;
}

interface Body {
  message: string;
  initiatives: InitiativeRef[];
}

const SYSTEM_PROMPT = `Você é o assistente de atualização do GRT Command Center da Bernhoeft GRT. Seu trabalho é interpretar mensagens em linguagem natural do Gabriel (Gerente Comercial) e extrair atualizações estruturadas para as iniciativas do time.

## Regras de parsing

1. MATCHING DE INICIATIVAS
- O Gabriel vai se referir às iniciativas por nome parcial, apelido ou contexto. Exemplos:
  - "600 leads" ou "retomada" → "Retomada dos 600+ leads"
  - "sequências" ou "pós-reunião" → "Sequências pós-reunião e pós-perda"
  - "precificação" ou "motor de preço" → desambiguar pelo contexto
  - "meetrox" ou "resumo reunião" → automação HubSpot
  - "playbook" → "Entregar 100% do playbook comercial"
  - "helper" ou "linkedin helper" → adesão do Helper
  - "150 maiores" → reuniões com lista das 150 maiores
  - "SDR IA" → "SDR com IA"
  - "BID" / "RFP" / "licitação" → BIDs/RFPs
  - "CRM" → checagem semanal de CRM
  - "CALC" → reuniões CALC
  - "materiais" / "apresentação" → materiais de apresentação
- Sempre inclua match_confidence 0-100. Abaixo de 70 marque como incerto.
- Se não conseguir associar, coloque em "unmatched" com texto original.

2. DETECÇÃO DE STATUS
- "bloqueado", "travado", "parado", "não anda", "empacou" → "bloqueado"
- "concluído", "pronto", "feito", "finalizou", "entregue", "no ar" → "concluido"
- "pausado", "parou por agora" → "pausado"
- "começou", "iniciou", "arrancou" → "em_andamento"
- Sem indicação → manter status atual da iniciativa

3. BLOQUEIOS
- "bloqueado por", "depende de", "esperando", "falta", "não respondeu", "precisa de aprovação" → blockers E impediment_update
- Se status virar bloqueado, o bloqueio vira impediment_update

4. PRÓXIMOS PASSOS
- "próximo passo", "vamos", "preciso", "segunda vou", "semana que vem", "agenda" → next_steps

5. FORMATO
- RESPONDER EXCLUSIVAMENTE COM JSON VÁLIDO. Sem markdown, sem backticks, sem explicação.
- Cada update deve ter todos os campos, mesmo que null.

6. MÚLTIPLAS ATUALIZAÇÕES
- Uma mensagem pode atualizar várias iniciativas. Separe corretamente.

7. CONTEXTO DO TIME
- Gabriel, Isabela, Elisvan, Yasmim, Emanoel, José Guilherme, Erlon, Gabriel Carvalho, Ana, Leilane, Jéssica, Miguel, José Lucas

## Comandos de consulta
Se a mensagem não for atualização mas PERGUNTA sobre o estado das iniciativas, responda diretamente em markdown.
Retorne type: "query" e o campo response com a resposta.

Exemplos:
- "como está tudo?" → resumo geral (contagens por status)
- "o que está bloqueado?" → lista de bloqueados com impedimentos
- "o que a Isabela tem?" → iniciativas filtradas por owner
- "o que não foi atualizado?" → sem check-in recente
- "quais são as prioridades?" → maior peso/impacto

Use os dados das iniciativas recebidas (status, owner, impediment). Seja direto, use dados concretos.

## Formato de saída JSON

Para ATUALIZAÇÕES:
{
  "type": "update",
  "updates": [
    {
      "initiative_id": "uuid",
      "initiative_title": "string",
      "initiative_number": number,
      "initiative_category": "string",
      "match_confidence": number,
      "progress": "string ou null",
      "blockers": "string ou null",
      "next_steps": "string ou null",
      "status_change": "string descritivo ou null",
      "new_status": "concluido|em_andamento|bloqueado|nao_iniciado|pausado",
      "impediment_update": "string ou null"
    }
  ],
  "unmatched": ["trechos não associados"],
  "summary": "string curta"
}

Para CONSULTAS:
{
  "type": "query",
  "response": "markdown",
  "updates": [],
  "unmatched": [],
  "summary": ""
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    if (!body.message || !Array.isArray(body.initiatives)) {
      return new Response(JSON.stringify({ error: "message e initiatives são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const initiativesContext = body.initiatives
      .map(
        (i) =>
          `- ID: ${i.id} | #${i.number} | [${i.category}] ${i.title} | status: ${i.status}${
            i.owner ? ` | owner: ${i.owner}` : ""
          }${i.impediment ? ` | impedimento atual: ${i.impediment}` : ""}`
      )
      .join("\n");

    const userMessage = `## Iniciativas disponíveis (use o ID exato no campo initiative_id):
${initiativesContext}

## Mensagem do Gabriel:
${body.message}

Retorne APENAS o JSON estruturado, sem markdown nem explicação.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao consultar a IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const content: string = aiData?.choices?.[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      // Strip potential code fences just in case
      const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI JSON:", content);
      return new Response(JSON.stringify({ error: "Resposta da IA inválida", raw: content }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize shape
    const result = {
      type: parsed.type ?? (parsed.response ? "query" : "update"),
      updates: Array.isArray(parsed.updates) ? parsed.updates : [],
      unmatched: Array.isArray(parsed.unmatched) ? parsed.unmatched : [],
      summary: parsed.summary ?? "",
      response: parsed.response ?? null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-chat-update error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
