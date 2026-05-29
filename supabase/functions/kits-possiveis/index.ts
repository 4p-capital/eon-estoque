// Edge Function: kits-possiveis
// Retorna quantos kits dá para montar por tipo de kit, com o insumo gargalo.
// GET (todos) ou POST { tipo_kit_id } para um tipo específico.
import { corsHeaders, json } from "../_shared/cors.ts";
import { clientFromRequest } from "../_shared/client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = clientFromRequest(req);

    if (req.method === "POST") {
      const { tipo_kit_id } = await req.json();
      if (!tipo_kit_id) return json({ error: "tipo_kit_id é obrigatório" }, 400);
      const { data, error } = await supabase.rpc("calcular_kits_possiveis", {
        p_tipo_kit_id: tipo_kit_id,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ resultado: data?.[0] ?? null });
    }

    const { data, error } = await supabase.from("kits_possiveis_view").select("*");
    if (error) return json({ error: error.message }, 400);
    return json({ kits: data });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
