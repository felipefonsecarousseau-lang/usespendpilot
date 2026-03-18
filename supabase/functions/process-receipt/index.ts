import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_CATEGORIES = ["mercado", "higiene", "limpeza", "bebidas", "padaria", "hortifruti", "outros"] as const;
type ProductCategory = typeof VALID_CATEGORIES[number];

interface ReceiptItem {
  nome_produto: string;
  nome_normalizado: string;
  categoria: ProductCategory;
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

// --- Validation & Post-processing ---

function validateAndCleanReceipt(raw: any): { data: ReceiptData; warnings: string[] } {
  const warnings: string[] = [];

  if (!raw || typeof raw !== "object") throw new Error("Resposta do AI não é um objeto válido");
  if (!raw.store?.nome) throw new Error("Nome do estabelecimento ausente");
  if (!Array.isArray(raw.items) || raw.items.length === 0) throw new Error("Nenhum item encontrado na nota");

  // Validate date
  let dataPurchase = raw.data_compra || new Date().toISOString().split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPurchase)) {
    warnings.push(`Data inválida "${raw.data_compra}", usando data atual`);
    dataPurchase = new Date().toISOString().split("T")[0];
  }

  // Clean and validate items
  const seen = new Map<string, number>();
  const cleanItems: ReceiptItem[] = [];

  for (const item of raw.items) {
    if (!item.nome_produto && !item.nome_normalizado) {
      warnings.push("Item sem nome ignorado");
      continue;
    }

    const nome_produto = String(item.nome_produto || item.nome_normalizado).trim();
    const nome_normalizado = String(item.nome_normalizado || item.nome_produto).trim();
    let quantidade = Math.max(Number(item.quantidade) || 1, 1);
    let preco_unitario = Math.abs(Number(item.preco_unitario) || 0);
    let preco_total = Math.abs(Number(item.preco_total) || 0);

    if (preco_total > 0 && preco_unitario > 0) {
      const expected = Math.round(quantidade * preco_unitario * 100) / 100;
      if (Math.abs(expected - preco_total) > 0.02) {
        warnings.push(`Preço inconsistente para "${nome_normalizado}": ${quantidade}×${preco_unitario}≠${preco_total}, recalculando`);
        preco_unitario = Math.round((preco_total / quantidade) * 100) / 100;
      }
    } else if (preco_total > 0 && preco_unitario === 0) {
      preco_unitario = Math.round((preco_total / quantidade) * 100) / 100;
    } else if (preco_unitario > 0 && preco_total === 0) {
      preco_total = Math.round(quantidade * preco_unitario * 100) / 100;
    }

    if (preco_total === 0) {
      warnings.push(`Item "${nome_normalizado}" com preço zero ignorado`);
      continue;
    }

    let categoria: ProductCategory = "outros";
    if (VALID_CATEGORIES.includes(item.categoria as ProductCategory)) {
      categoria = item.categoria as ProductCategory;
    } else {
      warnings.push(`Categoria inválida "${item.categoria}" para "${nome_normalizado}", usando "outros"`);
    }

    const dedupKey = nome_normalizado.toLowerCase();
    if (seen.has(dedupKey)) {
      const existingIdx = seen.get(dedupKey)!;
      const existing = cleanItems[existingIdx];
      warnings.push(`Duplicata "${nome_normalizado}" mesclada`);
      existing.quantidade += quantidade;
      existing.preco_total = Math.round((existing.preco_total + preco_total) * 100) / 100;
      existing.preco_unitario = Math.round((existing.preco_total / existing.quantidade) * 100) / 100;
      continue;
    }

    seen.set(dedupKey, cleanItems.length);
    cleanItems.push({ nome_produto, nome_normalizado, categoria, quantidade, preco_unitario, preco_total });
  }

  if (cleanItems.length === 0) throw new Error("Nenhum item válido após limpeza");

  const computedTotal = Math.round(cleanItems.reduce((s, i) => s + i.preco_total, 0) * 100) / 100;
  let valorTotal = Math.abs(Number(raw.valor_total) || 0);
  if (valorTotal === 0 || Math.abs(valorTotal - computedTotal) > 1) {
    if (valorTotal > 0) warnings.push(`Total da nota (${valorTotal}) difere da soma dos itens (${computedTotal}), usando soma`);
    valorTotal = computedTotal;
  }

  return {
    data: {
      store: { nome: String(raw.store.nome).trim(), cnpj: raw.store.cnpj ? String(raw.store.cnpj).trim() : null },
      data_compra: dataPurchase,
      valor_total: valorTotal,
      items: cleanItems,
    },
    warnings,
  };
}

// --- Save receipt to database ---
async function saveReceipt(supabaseAdmin: any, userId: string, receiptData: ReceiptData, req: Request) {
  let storeId: string;
  if (receiptData.store.cnpj) {
    const { data: existingStore } = await supabaseAdmin
      .from("stores").select("id").eq("user_id", userId).eq("cnpj", receiptData.store.cnpj).maybeSingle();
    if (existingStore) {
      storeId = existingStore.id;
      await supabaseAdmin.from("stores").update({ nome: receiptData.store.nome }).eq("id", storeId);
    } else {
      const { data: newStore, error: storeErr } = await supabaseAdmin
        .from("stores").insert({ user_id: userId, nome: receiptData.store.nome, cnpj: receiptData.store.cnpj }).select("id").single();
      if (storeErr) throw storeErr;
      storeId = newStore.id;
    }
  } else {
    const { data: newStore, error: storeErr } = await supabaseAdmin
      .from("stores").insert({ user_id: userId, nome: receiptData.store.nome }).select("id").single();
    if (storeErr) throw storeErr;
    storeId = newStore.id;
  }

  const { data: receipt, error: receiptErr } = await supabaseAdmin
    .from("receipts").insert({ user_id: userId, store_id: storeId, data_compra: receiptData.data_compra, valor_total: receiptData.valor_total })
    .select("id").single();
  if (receiptErr) throw receiptErr;

  const itemsToInsert = receiptData.items.map((item) => ({
    receipt_id: receipt.id,
    nome_produto: item.nome_produto,
    nome_normalizado: item.nome_normalizado,
    categoria: item.categoria,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    preco_total: item.preco_total,
  }));

  const { error: itemsErr } = await supabaseAdmin.from("receipt_items").insert(itemsToInsert);
  if (itemsErr) throw itemsErr;

  await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    action: "receipt_upload",
    details: { receipt_id: receipt.id, store_id: storeId, items_count: receiptData.items.length, valor_total: receiptData.valor_total },
    ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
  });

  return { receipt_id: receipt.id, store_id: storeId };
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase environment variables not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { mode = "parse", image_base64, image_url, receipt_data } = body;

    // === MODE: SAVE ===
    if (mode === "save") {
      if (!receipt_data) throw new Error("receipt_data is required for save mode");

      // Validate the provided data
      const { data: validatedData, warnings } = validateAndCleanReceipt(receipt_data);

      console.log("[OCR] Saving receipt from user confirmation", { user_id: user.id, items: validatedData.items.length });

      const result = await saveReceipt(supabaseAdmin, user.id, validatedData, req);

      return new Response(
        JSON.stringify({ success: true, ...result, data: validatedData, warnings }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === MODE: PARSE (OCR only, no save) ===
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!image_base64 && !image_url) throw new Error("image_base64 or image_url is required");

    if (image_base64 && image_base64.length > 14_000_000) {
      return new Response(JSON.stringify({ error: "Arquivo muito grande. Máximo 10MB." }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (image_url && typeof image_url === "string") {
      try {
        const parsed = new URL(image_url);
        if (!["https:"].includes(parsed.protocol)) throw new Error("Only HTTPS URLs allowed");
      } catch {
        return new Response(JSON.stringify({ error: "URL de imagem inválida." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("[OCR] Starting receipt processing (parse only)", { user_id: user.id, has_base64: !!image_base64, has_url: !!image_url });

    const imageContent = image_base64
      ? { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${image_base64}` } }
      : { type: "image_url" as const, image_url: { url: image_url } };

    const systemPrompt = `Você é um especialista em leitura de notas fiscais brasileiras. Analise a imagem e extraia TODOS os dados com máxima precisão.

REGRAS OBRIGATÓRIAS:
- Extraia o nome do estabelecimento e CNPJ (se visível).
- Extraia a data da compra no formato YYYY-MM-DD.
- Extraia o valor total da nota.
- Para cada produto REAL comprado, extraia: nome original, quantidade, preço unitário e preço total.
- Se a quantidade > 1, o preço unitário = preço_total / quantidade. NÃO confunda subtotal com preço unitário.
- Se a quantidade não estiver explícita, assuma 1.
- Se houver apenas preço total, use como unitário quando quantidade = 1.

IGNORE COMPLETAMENTE:
- Linhas de CPF, troco, subtotal geral, forma de pagamento, impostos, separadores visuais.

NORMALIZAÇÃO DE NOMES:
- Remova códigos internos do produto.
- Padronize: "ARROZ T1 5KG" → "Arroz 5kg", "DET LIMPOL 500ML" → "Detergente Limpol 500ml", "REF COCA 2L" → "Refrigerante Coca-Cola 2L".

CATEGORIZAÇÃO (use APENAS estas):
mercado, higiene, limpeza, bebidas, padaria, hortifruti, outros.
Se não souber a categoria, use "outros".`;

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
                        nome_normalizado: { type: "string", description: "Nome normalizado e legível" },
                        categoria: { type: "string", enum: ["mercado", "higiene", "limpeza", "bebidas", "padaria", "hortifruti", "outros"] },
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
      console.error("[OCR] AI gateway error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    console.log("[OCR] Raw AI tool_call arguments:", toolCall?.function?.arguments?.substring(0, 2000));

    if (!toolCall) {
      console.error("[OCR] AI did not return tool call. Full response:", JSON.stringify(aiResult).substring(0, 1000));
      return new Response(JSON.stringify({
        error: "Não conseguimos interpretar a nota fiscal. Tente uma foto mais nítida.",
        partial: true,
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let rawParsed: any;
    try {
      rawParsed = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      console.error("[OCR] JSON parse error:", parseErr, "Raw:", toolCall.function.arguments?.substring(0, 500));
      return new Response(JSON.stringify({
        error: "Erro ao interpretar os dados da nota. Tente novamente.",
        partial: true,
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let receiptData: ReceiptData;
    let warnings: string[] = [];
    try {
      const result = validateAndCleanReceipt(rawParsed);
      receiptData = result.data;
      warnings = result.warnings;
      if (warnings.length > 0) {
        console.log("[OCR] Validation warnings:", warnings);
      }
    } catch (validationErr) {
      console.error("[OCR] Validation failed:", validationErr, "Raw data:", JSON.stringify(rawParsed).substring(0, 1000));
      return new Response(JSON.stringify({
        error: `Nota fiscal com dados incompletos: ${(validationErr as Error).message}`,
        partial: true,
        raw_data: rawParsed,
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("[OCR] Receipt parsed successfully (not saved)", { store: receiptData.store.nome, items: receiptData.items.length, total: receiptData.valor_total });

    // Return parsed data WITHOUT saving
    return new Response(
      JSON.stringify({
        success: true,
        data: receiptData,
        warnings,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[OCR] process-receipt error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const safeMessage = message.includes("Unauthorized") || message.includes("Missing authorization")
      ? message
      : "Erro ao processar nota fiscal. Tente novamente.";
    return new Response(JSON.stringify({ error: safeMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
