import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";

// Client Supabase para Server Components / Server Actions / Route Handlers.
// No Next.js 16, cookies() é assíncrono — por isso o await.
// db.schema = "estoque": ver nota em client.ts.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database, "estoque">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "estoque" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component — o middleware cuida de renovar a sessão.
          }
        },
      },
    },
  );
}
