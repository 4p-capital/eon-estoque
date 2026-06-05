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
