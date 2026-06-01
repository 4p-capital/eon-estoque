// De-para que aprende: resolve item da NF-e -> insumo interno pela chave
// (CNPJ emitente + código do produto). USO NO SERVIDOR.

import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type ResolucaoItem = { insumoId: string; fatorConversao: number };

// Devolve um mapa codigo_produto -> {insumoId, fator} para os itens já mapeados.
export async function resolverDePara(
  supabase: SupabaseServer,
  emitenteCnpj: string,
  codigos: string[],
): Promise<Map<string, ResolucaoItem>> {
  const mapa = new Map<string, ResolucaoItem>();
  const limpos = codigos.filter(Boolean);
  if (!emitenteCnpj || limpos.length === 0) {
    return mapa;
  }

  const { data, error } = await supabase
    .from("de_para_fornecedor")
    .select("codigo_produto, insumo_id, fator_conversao")
    .eq("cnpj_emitente", emitenteCnpj)
    .in("codigo_produto", limpos);

  if (error) {
    console.error("[fiscal] resolverDePara", error);
    return mapa;
  }

  for (const row of data ?? []) {
    if (row.codigo_produto && row.insumo_id) {
      mapa.set(row.codigo_produto, {
        insumoId: row.insumo_id,
        fatorConversao: Number(row.fator_conversao ?? 1),
      });
    }
  }
  return mapa;
}
