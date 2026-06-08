"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type FormState = { status: "idle" | "ok" | "error"; message?: string };

const insumoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do insumo."),
  unidade: z.string().trim().min(1, "Informe a unidade (m, un, rolo...)."),
  estoque_min: z.coerce.number().min(0, "Não pode ser negativo.").default(0),
  lead_time_dias: z.coerce.number().int().min(0, "Não pode ser negativo.").default(0),
  consumo_dia: z.coerce.number().min(0, "Não pode ser negativo.").default(0),
});

export async function criarInsumo(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = insumoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("insumo").insert(parsed.data);
  if (error) {
    console.error("[insumos] criarInsumo", error);
    return { status: "error", message: "Não foi possível salvar o insumo." };
  }

  revalidatePath("/insumos/cadastro");
  revalidatePath("/insumos");
  return { status: "ok", message: "Insumo cadastrado." };
}

const editarSchema = insumoSchema.extend({ id: z.string().uuid("Insumo inválido.") });

// Edita um insumo do catálogo (nome, unidade, mínimo, lead time, consumo/dia).
// Mudar a unidade NÃO converte o saldo já lançado — fazer só com saldo zerado.
export async function editarInsumo(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = editarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { id, ...campos } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("insumo").update(campos).eq("id", id);
  if (error) {
    console.error("[insumos] editarInsumo", error);
    return { status: "error", message: "Não foi possível salvar o insumo." };
  }

  revalidatePath("/insumos/cadastro");
  revalidatePath("/insumos");
  revalidatePath("/tipos-kit");
  revalidatePath("/dashboard");
  return { status: "ok", message: "Insumo atualizado." };
}
