// Edge Function: ponto-de-pedido
// Lista os insumos com saldo, ponto de pedido e alerta de compra.
// GET (todos) ou POST { somente_alertas: true } para filtrar os que precisam comprar.
import { corsHeaders, json } from "../_shared/cors.ts";
import { clientFromRequest } from "../_shared/client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = clientFromRequest(req);
    let somenteAlertas = false;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      somenteAlertas = body?.somente_alertas === true;
    }

    let query = supabase.from("ponto_de_pedido_view").select("*");
    if (somenteAlertas) query = query.eq("precisa_comprar", true);

    const { data, error } = await query;
    if (error) return json({ error: error.message }, 400);
    return json({ insumos: data });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
