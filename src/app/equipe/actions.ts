"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { convidarUsuario } from "@/lib/auth/convite";
import { getSessao } from "@/lib/auth/sessao";
import { createAdminClient } from "@/lib/supabase/admin";

export type ConvidarState = {
  status: "idle" | "ok" | "error";
  message?: string;
  linkFallback?: string;
};

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do membro."),
  email: z.string().trim().email("E-mail inválido."),
  // tenant_admin pode convidar outro admin ou um gestor do MESMO tenant.
  papel: z.enum(["tenant_admin", "tenant_gestor"]),
});

export async function convidarMembro(
  _prev: ConvidarState,
  formData: FormData,
): Promise<ConvidarState> {
  // Só tenant_admin convida — e SEMPRE para o próprio tenant (nunca outro).
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "tenant_admin" || !sessao.tenantId) {
    return { status: "error", message: "Apenas o administrador do cliente pode convidar membros." };
  }

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    papel: formData.get("papel"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();

  // Membro já entra no tenant do convidante; vai direto pro app (sem onboarding).
  const convite = await convidarUsuario(admin, {
    email: parsed.data.email,
    nome: parsed.data.nome,
    tenantId: sessao.tenantId,
    papel: parsed.data.papel,
    next: "/",
  });
  if (!convite.ok) {
    return {
      status: "error",
      message:
        convite.motivo === "email_existe"
          ? "Já existe um usuário com esse e-mail."
          : "Não foi possível convidar o membro. Tente novamente.",
    };
  }

  revalidatePath("/equipe");
  return {
    status: "ok",
    message: `${parsed.data.nome} convidado como ${parsed.data.papel === "tenant_admin" ? "administrador" : "gestor"}.`,
    linkFallback: convite.linkFallback,
  };
}
