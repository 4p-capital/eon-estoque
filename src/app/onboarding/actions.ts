"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getSessao } from "@/lib/auth/sessao";
import { createAdminClient } from "@/lib/supabase/admin";

export type OnboardingState = { status: "idle" | "error"; message?: string };

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome de exibição da empresa."),
});

export async function completarOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "tenant_admin" || !sessao.tenantId) {
    return { status: "error", message: "Apenas o administrador do cliente pode completar o cadastro." };
  }

  const parsed = schema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant")
    .update({ nome: parsed.data.nome, onboarding_completo: true })
    .eq("id", sessao.tenantId);
  if (error) {
    console.error("[onboarding] completar", error);
    return { status: "error", message: "Não foi possível salvar. Tente novamente." };
  }

  redirect("/");
}
