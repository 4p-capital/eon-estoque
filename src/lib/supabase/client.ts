import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";

// Client Supabase para uso em Client Components ("use client").
// db.schema = "estoque": este app só toca o domínio de estoque (as tabelas de
// notificação vivem no schema public e não são acessadas aqui). Assim
// from("insumo") / rpc("produzir_lote") resolvem no schema certo sem prefixo.
export function createClient() {
  return createBrowserClient<Database, "estoque">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "estoque" } },
  );
}
