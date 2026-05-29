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

export async function criarInsumo(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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

  revalidatePath("/insumos");
  revalidatePath("/dashboard");
  return { status: "ok", message: "Insumo cadastrado." };
}

const entradaSchema = z.object({
  insumo_id: z.string().uuid("Selecione um insumo."),
  quantidade: z.coerce.number().positive("A quantidade deve ser maior que zero."),
  observacao: z.string().trim().max(280).optional(),
});

export async function registrarEntrada(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = entradaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase.from("movimentacao").insert({
    tipo: "entrada_insumo",
    insumo_id: parsed.data.insumo_id,
    quantidade: parsed.data.quantidade, // positivo = entrada
    observacao: parsed.data.observacao,
    usuario_id: auth.user?.id ?? null, // registra quem deu entrada (anti-furto)
  });
  if (error) {
    console.error("[insumos] registrarEntrada", error);
    return { status: "error", message: "Não foi possível registrar a entrada." };
  }

  revalidatePath("/insumos");
  revalidatePath("/dashboard");
  return { status: "ok", message: "Entrada registrada." };
}
