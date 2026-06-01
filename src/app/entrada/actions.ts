"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type AcaoResult = { ok: boolean; message?: string };

// --- Mapear item da nota -> insumo (grava o de-para que aprende) ----------
const mapearSchema = z.object({
  notaItemId: z.string().uuid(),
  emitenteCnpj: z.string().min(1),
  codigoProduto: z.string().min(1),
  descricaoFornecedor: z.string().default(""),
  ean: z.string().nullable().optional(),
  fatorConversao: z.coerce.number().positive().default(1),
  insumoId: z.string().uuid().optional(),
  novoInsumoNome: z.string().trim().optional(),
  novoInsumoUnidade: z.string().trim().optional(),
});

export async function mapearInsumo(
  input: z.input<typeof mapearSchema>,
): Promise<AcaoResult & { insumoId?: string; insumoNome?: string }> {
  const parsed = mapearSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();

  let insumoId = d.insumoId;
  let insumoNome = "";

  // Criar insumo novo, se foi o caso.
  if (!insumoId) {
    if (!d.novoInsumoNome || !d.novoInsumoUnidade) {
      return { ok: false, message: "Escolha um insumo ou informe nome e unidade do novo." };
    }
    const { data: novo, error } = await supabase
      .from("insumo")
      .insert({ nome: d.novoInsumoNome, unidade: d.novoInsumoUnidade })
      .select("id, nome")
      .single();
    if (error || !novo) {
      console.error("[entrada] mapearInsumo criar insumo", error);
      return { ok: false, message: "Não foi possível criar o insumo." };
    }
    insumoId = novo.id;
    insumoNome = novo.nome;
  } else {
    const { data: insumo } = await supabase.from("insumo").select("nome").eq("id", insumoId).single();
    insumoNome = insumo?.nome ?? "";
  }

  // Grava/atualiza o de-para por (emitente, código do produto).
  const { error: erroDePara } = await supabase
    .from("de_para_fornecedor")
    .upsert(
      {
        insumo_id: insumoId,
        cnpj_emitente: d.emitenteCnpj,
        codigo_produto: d.codigoProduto,
        descricao_fornecedor: d.descricaoFornecedor,
        codigo_ean: d.ean ?? null,
        fator_conversao: d.fatorConversao,
      },
      { onConflict: "cnpj_emitente,codigo_produto" },
    );
  if (erroDePara) {
    console.error("[entrada] mapearInsumo de_para", erroDePara);
    return { ok: false, message: "Não foi possível salvar o de-para." };
  }

  // Atualiza o item da nota atual.
  const { error: erroItem } = await supabase
    .from("nota_item")
    .update({ insumo_id: insumoId, fator_conversao: d.fatorConversao })
    .eq("id", d.notaItemId);
  if (erroItem) {
    console.error("[entrada] mapearInsumo nota_item", erroItem);
    return { ok: false, message: "Não foi possível vincular o item." };
  }

  return { ok: true, insumoId, insumoNome };
}

// --- Confirmar recebimento (RPC atômica) ----------------------------------
const receberSchema = z.object({
  notaId: z.string().uuid(),
  itens: z
    .array(z.object({ notaItemId: z.string().uuid(), recebido: z.coerce.number().min(0) }))
    .min(1),
});

export async function confirmarRecebimento(
  input: z.input<typeof receberSchema>,
): Promise<AcaoResult & { status?: string }> {
  const parsed = receberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Dados de recebimento inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("receber_nota", {
    p_nota_id: parsed.data.notaId,
    p_itens: parsed.data.itens.map((i) => ({ nota_item_id: i.notaItemId, recebido: i.recebido })),
  });
  if (error) {
    console.error("[entrada] confirmarRecebimento", error);
    return { ok: false, message: error.message || "Não foi possível registrar a entrada." };
  }

  return { ok: true, status: data?.status };
}

// --- Recusar a entrega inteira (RPC) --------------------------------------
const recusarSchema = z.object({
  notaId: z.string().uuid(),
  motivo: z.string().trim().min(3, "Descreva o motivo da recusa."),
});

export async function recusarRecebimento(input: z.input<typeof recusarSchema>): Promise<AcaoResult> {
  const parsed = recusarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("recusar_nota", {
    p_nota_id: parsed.data.notaId,
    p_motivo: parsed.data.motivo,
  });
  if (error) {
    console.error("[entrada] recusarRecebimento", error);
    return { ok: false, message: error.message || "Não foi possível recusar a entrega." };
  }

  return { ok: true };
}
