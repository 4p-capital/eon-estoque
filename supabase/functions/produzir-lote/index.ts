// Edge Function: produzir-lote
// Cria um lote, baixa os insumos pelo BOM e gera as unidades (com QR).
// Body JSON: { tipo_kit_id, quantidade, empreendimento_id?, local_id? }
import { corsHeaders, json } from "../_shared/cors.ts";
import { clientFromRequest } from "../_shared/client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  try {
    const { tipo_kit_id, quantidade, empreendimento_id, local_id } = await req.json();
    if (!tipo_kit_id || !quantidade) {
      return json({ error: "tipo_kit_id e quantidade são obrigatórios" }, 400);
    }

    const supabase = clientFromRequest(req);
    const { data, error } = await supabase.rpc("produzir_lote", {
      p_tipo_kit_id: tipo_kit_id,
      p_quantidade: quantidade,
      p_empreendimento_id: empreendimento_id ?? null,
      p_local_id: local_id ?? null,
    });

    if (error) return json({ error: error.message }, 400);
    return json({ lote: data });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
