"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type FormState = { status: "idle" | "ok" | "error"; message?: string };

const itemSchema = z
  .object({
    insumo_id: z.string().uuid().nullable(),
    nome: z.string().trim(),
    unidade: z.string().trim(),
    quantidade: z.coerce.number().positive("Quantidade deve ser maior que zero."),
    estoque_min: z.coerce.number().min(0, "Mínimo não pode ser negativo.").nullable().optional(),
  })
  .refine((i) => i.insumo_id !== null || (i.nome !== "" && i.unidade !== ""), {
    message: "Insumo novo precisa de nome e unidade.",
  });

const schema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do kit."),
  descricao: z.string().trim().optional().default(""),
  itens: z.array(itemSchema).min(1, "Adicione ao menos um insumo ao kit."),
});

export type CriarKitInput = z.input<typeof schema>;

const editarSchema = schema.extend({ kitId: z.string().uuid("Kit inválido.") });
export type EditarKitInput = z.input<typeof editarSchema>;

function revalidarKits() {
  revalidatePath("/tipos-kit");
  revalidatePath("/dashboard");
  revalidatePath("/producao");
  revalidatePath("/insumos");
}

export async function criarKit(input: CriarKitInput): Promise<FormState> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("criar_kit_com_bom", {
    p_nome: parsed.data.nome,
    p_descricao: parsed.data.descricao,
    p_itens: parsed.data.itens,
  });

  if (error) {
    console.error("[tipos-kit] criarKit", error);
    return { status: "error", message: error.message || "Não foi possível salvar o kit." };
  }

  revalidarKits();
  return { status: "ok", message: "Kit cadastrado." };
}

export async function editarKit(input: EditarKitInput): Promise<FormState> {
  const parsed = editarSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("editar_kit_com_bom", {
    p_kit_id: parsed.data.kitId,
    p_nome: parsed.data.nome,
    p_descricao: parsed.data.descricao,
    p_itens: parsed.data.itens,
  });

  if (error) {
    console.error("[tipos-kit] editarKit", error);
    return { status: "error", message: error.message || "Não foi possível salvar o kit." };
  }

  revalidarKits();
  return { status: "ok", message: "Kit atualizado." };
}
