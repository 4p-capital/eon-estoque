// Persistência e leitura de notas para conferência. USO NO SERVIDOR.

import type { createClient } from "@/lib/supabase/server";
import type { NotaFiscalParsed, NotaConferencia, ItemConferencia, StatusNota } from "@/lib/fiscal/types";
import { resolverDePara } from "@/lib/fiscal/de-para";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

type SpeMin = { id: string; razao_social: string; empreendimento_id: string | null };

// Garante a nota + itens persistidos (idempotente pela chave). Resolve o de-para
// dos itens no momento da 1ª gravação. Retorna o id da nota.
export async function prepararNota(
  supabase: SupabaseServer,
  spe: SpeMin,
  parsed: NotaFiscalParsed,
  xml: string,
): Promise<string> {
  const { data: existente } = await supabase
    .from("nota_fiscal")
    .select("id")
    .eq("chave", parsed.chave)
    .maybeSingle();
  if (existente) {
    return existente.id;
  }

  const { data: nota, error } = await supabase
    .from("nota_fiscal")
    .insert({
      chave: parsed.chave,
      spe_id: spe.id,
      empreendimento_id: spe.empreendimento_id,
      emitente_cnpj: parsed.emitente.cnpj,
      emitente_nome: parsed.emitente.nome,
      numero: parsed.numero,
      serie: parsed.serie,
      valor_total: parsed.valorTotal,
      data_emissao: parsed.dataEmissao,
      xml,
    })
    .select("id")
    .single();
  if (error || !nota) {
    console.error("[fiscal] prepararNota insert nota", error);
    throw new Error("Falha ao salvar a nota.");
  }

  const resolucao = await resolverDePara(
    supabase,
    parsed.emitente.cnpj,
    parsed.itens.map((i) => i.codigo),
  );

  const rows = parsed.itens.map((item) => {
    const match = resolucao.get(item.codigo);
    return {
      nota_id: nota.id,
      num_item: item.numero,
      codigo_fornecedor: item.codigo,
      descricao: item.descricao,
      ncm: item.ncm,
      cfop: item.cfop,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valor_unitario: item.valorUnitario,
      valor_total: item.valorTotal,
      ean: item.ean,
      insumo_id: match?.insumoId ?? null,
      fator_conversao: match?.fatorConversao ?? 1,
    };
  });

  const { error: erroItens } = await supabase.from("nota_item").insert(rows);
  if (erroItens) {
    console.error("[fiscal] prepararNota insert itens", erroItens);
    throw new Error("Falha ao salvar os itens da nota.");
  }

  return nota.id;
}

function nomeInsumo(insumo: unknown): string | null {
  const obj = Array.isArray(insumo) ? insumo[0] : insumo;
  if (obj && typeof obj === "object" && "nome" in obj) {
    return String((obj as { nome: unknown }).nome ?? "") || null;
  }
  return null;
}

// Carrega a nota e itens já no formato de conferência (camelCase) para a UI.
export async function carregarNota(
  supabase: SupabaseServer,
  notaId: string,
  destinatarioNome: string,
): Promise<{ nota: NotaConferencia; itens: ItemConferencia[] } | null> {
  const { data: nota } = await supabase
    .from("nota_fiscal")
    .select("id, chave, numero, serie, emitente_cnpj, emitente_nome, valor_total, data_emissao, status, empreendimento_id")
    .eq("id", notaId)
    .single();
  if (!nota) {
    return null;
  }

  const { data: itens } = await supabase
    .from("nota_item")
    .select(
      "id, num_item, codigo_fornecedor, descricao, ncm, unidade, quantidade, valor_unitario, valor_total, ean, insumo_id, fator_conversao, quantidade_recebida, insumo:insumo_id(nome)",
    )
    .eq("nota_id", notaId)
    .order("num_item");

  return {
    nota: {
      id: nota.id,
      chave: nota.chave,
      numero: nota.numero ?? "",
      serie: nota.serie ?? "",
      emitenteNome: nota.emitente_nome ?? "",
      emitenteCnpj: nota.emitente_cnpj ?? "",
      destinatarioNome,
      valorTotal: Number(nota.valor_total ?? 0),
      dataEmissao: nota.data_emissao,
      status: nota.status as StatusNota,
      empreendimentoId: nota.empreendimento_id,
    },
    itens: (itens ?? []).map((it) => ({
      id: it.id,
      numItem: it.num_item,
      codigo: it.codigo_fornecedor ?? "",
      descricao: it.descricao ?? "",
      ncm: it.ncm ?? "",
      unidade: it.unidade ?? "",
      quantidade: Number(it.quantidade),
      valorUnitario: Number(it.valor_unitario ?? 0),
      valorTotal: Number(it.valor_total ?? 0),
      ean: it.ean,
      insumoId: it.insumo_id,
      insumoNome: nomeInsumo(it.insumo),
      fatorConversao: Number(it.fator_conversao ?? 1),
      quantidadeRecebida: it.quantidade_recebida === null ? null : Number(it.quantidade_recebida),
    })),
  };
}
