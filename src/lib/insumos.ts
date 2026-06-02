// Busca de insumos para os pickers. USO NO SERVIDOR.
// O PostgREST corta em 1000 linhas por requisição; o catálogo tem milhares,
// então paginamos em lotes para trazer TODOS (senão o picker não acha
// insumos do fim do alfabeto, ex.: "Saco", "Filme").

import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type InsumoOpcao = { id: string; nome: string; unidade: string };

const LOTE = 1000;

export async function listarTodosInsumos(supabase: SupabaseServer): Promise<InsumoOpcao[]> {
  const todos: InsumoOpcao[] = [];
  for (let from = 0; ; from += LOTE) {
    const { data, error } = await supabase
      .from("insumo")
      .select("id, nome, unidade")
      .order("nome")
      .range(from, from + LOTE - 1);
    if (error) {
      console.error("[insumos] listarTodosInsumos", error);
      break;
    }
    if (!data || data.length === 0) {
      break;
    }
    todos.push(...data);
    if (data.length < LOTE) {
      break;
    }
  }
  return todos;
}
