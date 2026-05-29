import { createClient } from "@/lib/supabase/server";
import type { KitPossivel, PontoPedido } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getDados() {
  try {
    const supabase = await createClient();
    const [kits, pontos] = await Promise.all([
      supabase.from("kits_possiveis_view").select("*"),
      supabase.from("ponto_de_pedido_view").select("*"),
    ]);
    if (kits.error || pontos.error) {
      return { erro: kits.error?.message ?? pontos.error?.message };
    }
    return {
      kits: (kits.data ?? []) as KitPossivel[],
      pontos: (pontos.data ?? []) as PontoPedido[],
    };
  } catch (e) {
    return { erro: String(e) };
  }
}

const nf = new Intl.NumberFormat("pt-BR");

export default async function DashboardPage() {
  const dados = await getDados();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-preto">
          Controle de Estoque — EON Instalações
        </h1>
        <p className="mt-1 text-sm text-cinza/70">
          Capacidade de produção atual e alertas de compra.
        </p>
      </header>

      {dados.erro ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-medium">Supabase ainda não conectado.</p>
          <p className="mt-2">
            Configure o <code>.env.local</code> e rode as migrations
            (<code>supabase db reset</code> no local, ou conecte um projeto na
            nuvem). Detalhe técnico: {dados.erro}
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Cálculo 1 — Kits possíveis */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cinza/60">
              Kits possíveis agora
            </h2>
            <div className="space-y-3">
              {dados.kits!.map((k) => (
                <div
                  key={k.tipo_kit_id}
                  className="rounded-lg border border-bege-claro bg-white p-4"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">{k.tipo_kit_nome}</span>
                    <span className="text-2xl font-semibold tabular-nums">
                      {nf.format(k.qtd_possivel ?? 0)}
                    </span>
                  </div>
                  {k.insumo_gargalo_nome && (
                    <p className="mt-1 text-xs text-cinza/60">
                      Gargalo:{" "}
                      <span className="font-medium text-preto">{k.insumo_gargalo_nome}</span>
                    </p>
                  )}
                </div>
              ))}
              {dados.kits!.length === 0 && (
                <p className="text-sm text-zinc-500">
                  Nenhum tipo de kit cadastrado ainda.
                </p>
              )}
            </div>
          </section>

          {/* Cálculo 2 — Ponto de pedido */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cinza/60">
              Estoque & ponto de pedido
            </h2>
            <div className="overflow-hidden rounded-lg border border-bege-claro">
              <table className="w-full text-sm">
                <thead className="bg-bege-claro/40 text-left text-xs uppercase text-cinza/60">
                  <tr>
                    <th className="px-3 py-2">Insumo</th>
                    <th className="px-3 py-2 text-right">Saldo</th>
                    <th className="px-3 py-2 text-right">Ponto</th>
                    <th className="px-3 py-2 text-right">Comprar</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.pontos!.map((p) => (
                    <tr
                      key={p.insumo_id}
                      className="border-t border-bege-claro"
                    >
                      <td className="px-3 py-2">{p.nome}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {nf.format(p.saldo ?? 0)} {p.unidade}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-500">
                        {nf.format(p.ponto_pedido ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {p.precisa_comprar ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            {nf.format(p.sugestao_compra ?? 0)} {p.unidade}
                          </span>
                        ) : (
                          <span className="text-xs text-cinza/50">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
