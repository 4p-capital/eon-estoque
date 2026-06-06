"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { convidarUsuario } from "@/lib/auth/convite";
import { getSessao } from "@/lib/auth/sessao";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProvisionarState = {
  status: "idle" | "ok" | "error";
  message?: string;
  // Link de fallback (magic link), caso o e-mail de convite não chegue.
  linkFallback?: string;
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_REGEX, "Slug inválido (use letras, números e hífen).")
    .optional()
    .or(z.literal("")),
  adminEmail: z.string().trim().email("E-mail do admin inválido."),
  adminNome: z.string().trim().min(2, "Informe o nome do admin do cliente."),
});

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function provisionarTenant(
  _prev: ProvisionarState,
  formData: FormData,
): Promise<ProvisionarState> {
  // Só galpao_admin convida clientes (cria tenant rascunho + convida o admin).
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "galpao_admin") {
    return { status: "error", message: "Apenas um administrador do galpão pode cadastrar clientes." };
  }

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    slug: formData.get("slug") ?? "",
    adminEmail: formData.get("adminEmail"),
    adminNome: formData.get("adminNome"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const nome = parsed.data.nome;
  const slug = parsed.data.slug && parsed.data.slug.length > 0 ? parsed.data.slug : slugify(nome);
  if (!SLUG_REGEX.test(slug)) {
    return { status: "error", message: "Não consegui gerar um slug válido a partir do nome." };
  }

  const admin = createAdminClient();

  // 1) cria o tenant RASCUNHO (nome de referência; o cliente completa no onboarding).
  const { data: tenant, error: erroTenant } = await admin
    .from("tenant")
    .insert({ nome, slug })
    .select("id")
    .single();
  if (erroTenant || !tenant) {
    console.error("[clientes] criar tenant", erroTenant);
    const duplicado = erroTenant?.code === "23505";
    return {
      status: "error",
      message: duplicado
        ? `Já existe um cliente com o slug "${slug}".`
        : "Não foi possível criar o cliente.",
    };
  }

  // 2) convida o admin do cliente (template Invite -> /onboarding no 1º acesso).
  const convite = await convidarUsuario(admin, {
    email: parsed.data.adminEmail,
    nome: parsed.data.adminNome,
    tenantId: tenant.id,
    papel: "tenant_admin",
    next: "/onboarding",
  });
  if (!convite.ok) {
    // compensa: remove o tenant rascunho órfão
    await admin.from("tenant").delete().eq("id", tenant.id);
    return {
      status: "error",
      message:
        convite.motivo === "email_existe"
          ? "Já existe um usuário com esse e-mail. Use outro e-mail para o admin do cliente."
          : "Não foi possível convidar o admin do cliente. Tente novamente.",
    };
  }

  revalidatePath("/clientes");
  return {
    status: "ok",
    message: `Convite enviado para ${parsed.data.adminEmail}. Ele completa o cadastro da empresa no primeiro acesso.`,
    linkFallback: convite.linkFallback,
  };
}

const reenviarSchema = z.object({ email: z.string().trim().email("E-mail inválido.") });

export async function reenviarConviteCliente(
  _prev: ProvisionarState,
  formData: FormData,
): Promise<ProvisionarState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "galpao_admin") {
    return { status: "error", message: "Apenas um administrador do galpão pode reenviar convites." };
  }
  const parsed = reenviarSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const email = parsed.data.email;
  const admin = createAdminClient();

  // Acha o admin pendente desse cliente (perfil tenant_admin com esse e-mail).
  const { data: perfil } = await admin
    .from("perfil")
    .select("id, tenant_id, nome")
    .eq("email", email)
    .eq("papel", "tenant_admin")
    .maybeSingle();
  if (!perfil?.tenant_id) {
    return { status: "error", message: "Não encontrei o convite desse cliente." };
  }

  // Só reenvia (re-provisiona) enquanto o cliente NÃO concluiu o onboarding.
  const { data: tenant } = await admin
    .from("tenant")
    .select("onboarding_completo")
    .eq("id", perfil.tenant_id)
    .single();
  if (tenant?.onboarding_completo) {
    return { status: "error", message: "Esse cliente já concluiu o acesso — não precisa reenviar." };
  }

  // Re-provisiona: remove o usuário pendente e dispara um convite NOVO (template
  // Invite = link limpo, sem código). O tenant rascunho permanece.
  const { error: erroDel } = await admin.auth.admin.deleteUser(perfil.id);
  if (erroDel) {
    console.error("[clientes] reenviar deleteUser", erroDel);
    return { status: "error", message: "Não foi possível reenviar. Tente novamente." };
  }

  const convite = await convidarUsuario(admin, {
    email,
    nome: perfil.nome ?? email,
    tenantId: perfil.tenant_id,
    papel: "tenant_admin",
    next: "/onboarding",
  });
  if (!convite.ok) {
    return { status: "error", message: "Não foi possível reenviar o convite." };
  }

  revalidatePath("/clientes");
  return {
    status: "ok",
    message: `Convite reenviado para ${email}.`,
    linkFallback: convite.linkFallback,
  };
}
