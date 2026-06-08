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

const PAPEIS_GALPAO = ["galpao_admin", "galpao_operador"] as const;
const PAPEIS_TENANT = ["tenant_admin", "tenant_gestor"] as const;

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do membro."),
  email: z.string().trim().email("E-mail inválido."),
  papel: z.enum(["galpao_admin", "galpao_operador", "tenant_admin", "tenant_gestor"]),
});

const LABEL_PAPEL: Record<string, string> = {
  galpao_admin: "administrador",
  galpao_operador: "operador",
  tenant_admin: "administrador",
  tenant_gestor: "gestor",
};

// Convida um membro para a MESMA equipe do convidante:
//   - galpao_admin -> equipe do galpão (operador/admin), no tenant do galpão;
//   - tenant_admin -> equipe do cliente (gestor/admin), no próprio tenant.
// Sempre no tenant do convidante; nunca cruza para outro tenant/mundo.
export async function convidarMembro(
  _prev: ConvidarState,
  formData: FormData,
): Promise<ConvidarState> {
  const sessao = await getSessao();
  const ehGalpao = sessao?.papel === "galpao_admin";
  const ehTenant = sessao?.papel === "tenant_admin";
  if (!sessao?.tenantId || (!ehGalpao && !ehTenant)) {
    return { status: "error", message: "Apenas o administrador pode convidar membros." };
  }

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    papel: formData.get("papel"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const permitidos: readonly string[] = ehGalpao ? PAPEIS_GALPAO : PAPEIS_TENANT;
  if (!permitidos.includes(parsed.data.papel)) {
    return { status: "error", message: "Papel inválido para o seu acesso." };
  }

  const admin = createAdminClient();
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
    message: `${parsed.data.nome} convidado como ${LABEL_PAPEL[parsed.data.papel] ?? "membro"}.`,
    linkFallback: convite.linkFallback,
  };
}
