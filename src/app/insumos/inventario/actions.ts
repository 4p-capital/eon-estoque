"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ActionState = { status: "idle" | "ok" | "error"; message?: string };

const criarSchema = z.object({
  empreendimento_id: z.string().uuid("Selecione um empreendimento."),
  regiao: z.string().trim().max(120).optional(),
  observacao: z.string().trim().max(280).optional(),
});

export async function criarContagem(input: {
  empreendimento_id: string;
  regiao?: string;
  observacao?: string;
}): Promise<{ id?: string; error?: string }> {
  const parsed = criarSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("contagem")
    .insert({
      empreendimento_id: parsed.data.empreendimento_id,
      regiao: parsed.data.regiao || null,
      observacao: parsed.data.observacao || null,
      criado_por: auth.user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[inventario] criarContagem", error);
    return { error: "Não foi possível criar a contagem." };
  }

  revalidatePath("/insumos/inventario");
  return { id: data.id };
}

const itensSchema = z.array(
  z.object({
    insumo_id: z.string().uuid(),
    qtd_contada: z.number().min(0),
  }),
);

export async function salvarItens(
  contagemId: string,
  itens: { insumo_id: string; qtd_contada: number }[],
): Promise<ActionState> {
  const parsed = itensSchema.safeParse(itens);
  if (!parsed.success) {
    return { status: "error", message: "Itens inválidos." };
  }

  const supabase = await createClient();

  // Substitui o conjunto: remove os que saíram, regrava os atuais.
  const ids = parsed.data.map((i) => i.insumo_id);
  let del = supabase.from("contagem_item").delete().eq("contagem_id", contagemId);
  if (ids.length > 0) del = del.not("insumo_id", "in", `(${ids.join(",")})`);
  const { error: errDel } = await del;
  if (errDel) {
    console.error("[inventario] salvarItens delete", errDel);
    return { status: "error", message: "Não foi possível salvar a contagem." };
  }

  if (parsed.data.length > 0) {
    const rows = parsed.data.map((i) => ({
      contagem_id: contagemId,
      insumo_id: i.insumo_id,
      qtd_contada: i.qtd_contada,
    }));
    const { error } = await supabase
      .from("contagem_item")
      .upsert(rows, { onConflict: "contagem_id,insumo_id" });
    if (error) {
      console.error("[inventario] salvarItens upsert", error);
      return { status: "error", message: "Não foi possível salvar a contagem." };
    }
  }

  revalidatePath(`/insumos/inventario/${contagemId}`);
  return { status: "ok", message: "Contagem salva." };
}

export async function aplicarContagem(contagemId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("aplicar_contagem", { p_contagem_id: contagemId });
  if (error) {
    console.error("[inventario] aplicarContagem", error);
    return { status: "error", message: error.message || "Não foi possível aplicar a contagem." };
  }

  revalidatePath("/insumos/inventario");
  revalidatePath(`/insumos/inventario/${contagemId}`);
  revalidatePath("/insumos");
  revalidatePath("/");
  return { status: "ok", message: "Contagem aplicada — estoque ajustado." };
}

export async function cancelarContagem(contagemId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contagem")
    .update({ status: "cancelada" })
    .eq("id", contagemId)
    .eq("status", "aberta");
  if (error) {
    console.error("[inventario] cancelarContagem", error);
    return { status: "error", message: "Não foi possível cancelar a contagem." };
  }
  revalidatePath("/insumos/inventario");
  revalidatePath(`/insumos/inventario/${contagemId}`);
  return { status: "ok", message: "Contagem cancelada." };
}
