import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isGalpaoPapel, isPapel, type Papel } from "@/lib/auth/papel";

// Sessão resolvida no servidor: identidade + papel/tenant vindos do app_metadata
// (que entra no JWT). Fonte única de verdade do gating de UI/rotas no servidor.
export type Sessao = {
  userId: string;
  email: string | null;
  papel: Papel | null;
  tenantId: string | null;
  isGalpao: boolean;
};

export async function getSessao(): Promise<Sessao | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const rawPapel = user.app_metadata?.papel;
  const papel = isPapel(rawPapel) ? rawPapel : null;
  const rawTenant = user.app_metadata?.tenant_id;
  const tenantId = typeof rawTenant === "string" && rawTenant.length > 0 ? rawTenant : null;

  return {
    userId: user.id,
    email: user.email ?? null,
    papel,
    tenantId,
    isGalpao: isGalpaoPapel(papel),
  };
}
