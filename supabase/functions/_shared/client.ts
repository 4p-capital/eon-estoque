import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Cria um client Supabase já autenticado com o JWT do chamador.
// Assim a RLS e o auth.uid() (usado nas funções SQL) funcionam normalmente.
export function clientFromRequest(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}
