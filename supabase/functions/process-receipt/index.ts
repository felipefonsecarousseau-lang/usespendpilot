import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReceiptItem {
  nome_produto: string;
  nome_normalizado: string;
  categoria: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
}

interface ReceiptData {
  store: { nome: string; cnpj: string | null };
  data_compra: string;
  valor_total: number;
  items: ReceiptItem[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Create admin client for DB operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create user client to get user id
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { image_base64, image_url } = await req.json();
    if (!image_base64 && !image_url) {
      throw new Error("image_base64 or image_url is required");
    }

    // Build the content for the AI
    const imageContent = image_base64
      ? { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${image_base64}` } }
      : { type: "image_url" as const, image_url: { url: image_url } };

    const systemPrompt = `Você é um especialista em leitura de notas fiscais brasileiras. Analise a imagem da nota fiscal e extraia todos os dados.

Regras OBRIGATÓRIAS:
- Extraia o nome do estabelecimento e CNPJ (se visível).
- Extraia a data da compra no formato YYYY-MM-DD.
- Extraia o valor total da nota.
- Para cada produto, extraia: nome original, quantidade, preço unitário e preço total.
- Se a quantidade > 1, o preço unitário = preço_total / quantidade. NÃO confunda subtotal com preço unitário.
- Ignore linhas que NÃO são produtos: CPF, troco, subtotal, forma de pagamento, impostos, etc.
- Normalize o nome do produto: "ARROZ T1 5KG" → "Arroz 5kg", "DET LIMPOL 500ML" → "Detergente Limpol 500ml".
- Categorize cada produto usando APENAS estas categorias: mercado, higiene, limpeza, bebidas, padaria, hortifruti, outros.
- Se não conseguir identificar a categoria, use "outros".`;

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta nota fiscal e extraia todos os dados estruturados." },
              imageContent,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt",
              description: "Retorna os dados estruturados extraídos da nota fiscal.",
              parameters: {
                type: "object",
                properties: {
                  store: {
                    type: "object",
                    properties: {
                      nome: { type: "string", description: "Nome do estabelecimento" },
                      cnpj: { type: "string", description: "CNPJ do estabelecimento ou null" },
                    },
                    required: ["nome"],
                    additionalProperties: false,
                  },
                  data_compra: { type: "string", description: "Data da compra no formato YYYY-MM-DD" },
                  valor_total: { type: "number", description: "Valor total da nota fiscal" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome_produto: { type: "string", description: "Nome original do produto na nota" },
                        nome_normalizado: { type: "string", description: "Nome normalizado e legível do produto" },
                        categoria: {
                          type: "string",
                          enum: ["mercado", "higiene", "limpeza", "bebidas", "padaria", "hortifruti", "outros"],
                        },
                        quantidade: { type: "number" },
                        preco_unitario: { type: "number" },
                        preco_total: { type: "number" },
                      },
                      required: ["nome_produto", "nome_normalizado", "categoria", "quantidade", "preco_unitario", "preco_total"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["store", "data_compra", "valor_total", "items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const receiptData: ReceiptData = JSON.parse(toolCall.function.arguments);

    // --- Save to database ---

    // 1. Upsert store by CNPJ (or insert if no CNPJ)
    let storeId: string;
    if (receiptData.store.cnpj) {
      const { data: existingStore } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .eq("cnpj", receiptData.store.cnpj)
        .maybeSingle();

      if (existingStore) {
        storeId = existingStore.id;
        // Update name if needed
        await supabaseAdmin
          .from("stores")
          .update({ nome: receiptData.store.nome })
          .eq("id", storeId);
      } else {
        const { data: newStore, error: storeErr } = await supabaseAdmin
          .from("stores")
          .insert({ user_id: user.id, nome: receiptData.store.nome, cnpj: receiptData.store.cnpj })
          .select("id")
          .single();
        if (storeErr) throw storeErr;
        storeId = newStore.id;
      }
    } else {
      const { data: newStore, error: storeErr } = await supabaseAdmin
        .from("stores")
        .insert({ user_id: user.id, nome: receiptData.store.nome })
        .select("id")
        .single();
      if (storeErr) throw storeErr;
      storeId = newStore.id;
    }

    // 2. Create receipt
    const { data: receipt, error: receiptErr } = await supabaseAdmin
      .from("receipts")
      .insert({
        user_id: user.id,
        store_id: storeId,
        data_compra: receiptData.data_compra,
        valor_total: receiptData.valor_total,
      })
      .select("id")
      .single();
    if (receiptErr) throw receiptErr;

    // 3. Insert receipt items
    const itemsToInsert = receiptData.items.map((item) => ({
      receipt_id: receipt.id,
      nome_produto: item.nome_produto,
      nome_normalizado: item.nome_normalizado,
      categoria: item.categoria,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      preco_total: item.preco_total,
    }));

    const { error: itemsErr } = await supabaseAdmin
      .from("receipt_items")
      .insert(itemsToInsert);
    if (itemsErr) throw itemsErr;

    return new Response(
      JSON.stringify({
        success: true,
        receipt_id: receipt.id,
        store_id: storeId,
        data: receiptData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-receipt error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
