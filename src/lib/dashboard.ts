import { createClient } from "@/lib/supabase/server";
import type { KitPossivel, PontoPedido } from "@/lib/types";

export type DadosDashboard =
  | { erro: string }
  | { kits: KitPossivel[]; pontos: PontoPedido[] };

// Busca os dois views que alimentam tanto a home (/) quanto o dashboard.
// Centralizado aqui para as duas telas compartilharem a mesma fonte (DRY).
export async function getDadosDashboard(): Promise<DadosDashboard> {
  try {
    const supabase = await createClient();
    const [kits, pontos] = await Promise.all([
      supabase.from("kits_possiveis_view").select("*"),
      supabase.from("ponto_de_pedido_view").select("*"),
    ]);
    if (kits.error || pontos.error) {
      return { erro: kits.error?.message ?? pontos.error?.message ?? "Erro desconhecido" };
    }
    return {
      kits: (kits.data ?? []) as KitPossivel[],
      pontos: (pontos.data ?? []) as PontoPedido[],
    };
  } catch (e) {
    console.error("[Dashboard] falha ao buscar dados", e);
    return { erro: String(e) };
  }
}

// Agrega os KPIs derivados (sem nova query) usados nos stat-cards.
export function resumoDashboard(kits: KitPossivel[], pontos: PontoPedido[]) {
  return {
    totalKits: kits.reduce((acc, k) => acc + (k.qtd_possivel ?? 0), 0),
    insumosMonitorados: pontos.length,
    aComprar: pontos.filter((p) => p.precisa_comprar).length,
  };
}
