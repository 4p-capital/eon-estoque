import "server-only";

import type { Papel } from "@/lib/auth/papel";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type ConviteInput = {
  email: string;
  nome: string;
  tenantId: string;
  papel: Papel;
  // Pra onde o link de convite leva após logar (ex.: "/onboarding" ou "/").
  next: string;
};

export type ConviteResult =
  | { ok: true; userId: string; linkFallback?: string }
  | { ok: false; motivo: "email_existe" | "erro" };

function redirectBase(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return site && site.length > 0 ? site : "http://localhost:3000";
}

// Convida um usuário (template "Invite user"): cria a conta, manda o e-mail de
// convite, carimba app_metadata (tenant_id + papel, que é o enforcement da RLS),
// espelha o perfil e devolve um magic link de fallback (caso o e-mail falhe).
export async function convidarUsuario(
  admin: AdminClient,
  { email, nome, tenantId, papel, next }: ConviteInput,
): Promise<ConviteResult> {
  const redirectTo = `${redirectBase()}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data: convidado, error: erroInvite } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo,
  });
  if (erroInvite || !convidado.user) {
    console.error("[convite] inviteUserByEmail", erroInvite);
    const jaExiste = erroInvite?.message?.toLowerCase().includes("already");
    return { ok: false, motivo: jaExiste ? "email_existe" : "erro" };
  }

  const userId = convidado.user.id;

  // app_metadata entra no JWT -> é o que a RLS lê (tenant_id + papel).
  const { error: erroMeta } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: tenantId, papel },
  });
  if (erroMeta) {
    console.error("[convite] updateUserById app_metadata", erroMeta);
    return { ok: false, motivo: "erro" };
  }

  // Espelho na tabela perfil (fonte da UI de membros). Não-fatal: o enforcement
  // é o app_metadata já gravado.
  const { error: erroPerfil } = await admin.from("perfil").insert({
    id: userId,
    tenant_id: tenantId,
    papel,
    nome,
    email,
  });
  if (erroPerfil) {
    console.error("[convite] inserir perfil", erroPerfil);
  }

  // Link de fallback (magic link) caso o e-mail de convite não chegue.
  let linkFallback: string | undefined;
  const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (erroLink) {
    console.error("[convite] generateLink", erroLink);
  } else {
    linkFallback = link.properties?.action_link;
  }

  return { ok: true, userId, linkFallback };
}

// Reenvia o acesso a um usuário JÁ existente (convite não chegou / link expirou):
// dispara o e-mail (signInWithOtp) e devolve um magic link de fallback.
export async function reenviarConvite(
  admin: AdminClient,
  email: string,
  next: string,
): Promise<string | undefined> {
  const redirectTo = `${redirectBase()}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error: erroOtp } = await admin.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
  if (erroOtp) {
    console.error("[convite] reenviar signInWithOtp", erroOtp);
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (error) {
    console.error("[convite] reenviar generateLink", error);
    return undefined;
  }
  return data.properties?.action_link;
}
