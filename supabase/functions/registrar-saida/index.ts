// Edge Function: registrar-saida
// Bipagem do QR na saída do kit: baixa a unidade e registra quem/quando/destino.
// Body JSON: { qr_code, local_destino_id?, observacao? }
import { corsHeaders, json } from "../_shared/cors.ts";
import { clientFromRequest } from "../_shared/client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  try {
    const { qr_code, local_destino_id, observacao } = await req.json();
    if (!qr_code) return json({ error: "qr_code é obrigatório" }, 400);

    const supabase = clientFromRequest(req);
    const { data, error } = await supabase.rpc("registrar_saida_kit", {
      p_qr_code: qr_code,
      p_local_destino_id: local_destino_id ?? null,
      p_observacao: observacao ?? null,
    });

    if (error) return json({ error: error.message }, 400);
    return json({ unidade: data });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
