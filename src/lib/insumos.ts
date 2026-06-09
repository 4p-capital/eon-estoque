// Busca de insumos para os pickers. USO NO SERVIDOR.
// O PostgREST corta em 1000 linhas por requisição; o catálogo tem milhares,
// então paginamos em lotes para trazer TODOS (senão o picker não acha
// insumos do fim do alfabeto, ex.: "Saco", "Filme").

import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// estoqueMin é o mínimo GLOBAL do insumo (estoque.insumo.estoque_min, default 0).
// 0 = sem mínimo definido. Vem junto p/ o picker do BOM pré-preencher a coluna MÍN.
export type InsumoOpcao = { id: string; nome: string; unidade: string; estoqueMin: number };

const LOTE = 1000;

export async function listarTodosInsumos(supabase: SupabaseServer): Promise<InsumoOpcao[]> {
  const todos: InsumoOpcao[] = [];
  for (let from = 0; ; from += LOTE) {
    const { data, error } = await supabase
      .from("insumo")
      .select("id, nome, unidade, estoque_min")
      .order("nome")
      .range(from, from + LOTE - 1);
    if (error) {
      console.error("[insumos] listarTodosInsumos", error);
      break;
    }
    if (!data || data.length === 0) {
      break;
    }
    todos.push(
      ...data.map((r) => ({
        id: r.id,
        nome: r.nome,
        unidade: r.unidade,
        estoqueMin: Number(r.estoque_min ?? 0),
      })),
    );
    if (data.length < LOTE) {
      break;
    }
  }
  return todos;
}
