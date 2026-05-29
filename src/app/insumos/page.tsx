import { createClient } from "@/lib/supabase/server";
import { cardCls } from "@/app/_components/form-styles";
import { NovoInsumoForm } from "@/app/insumos/_components/novo-insumo-form";
import { EntradaEstoqueForm } from "@/app/insumos/_components/entrada-estoque-form";
import { SaldoTable } from "@/app/insumos/_components/saldo-table";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saldo_insumo")
    .select("*")
    .order("nome");

  const saldos = data ?? [];
  const options = saldos
    .filter((s) => s.insumo_id !== null)
    .map((s) => ({ id: s.insumo_id!, nome: s.nome ?? "—", unidade: s.unidade ?? "" }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-preto">Insumos</h1>
        <p className="mt-1 text-sm text-cinza/70">
          Cadastro de matéria-prima, saldo atual e entrada de estoque.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <section className={cardCls}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-cinza/60">
              Novo insumo
            </h2>
            <NovoInsumoForm />
          </section>

          <section className={cardCls}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-cinza/60">
              Entrada de estoque
            </h2>
            <EntradaEstoqueForm insumos={options} />
          </section>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cinza/60">
            Saldo atual
          </h2>
          {error ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Não foi possível carregar os saldos. {error.message}
            </p>
          ) : (
            <SaldoTable saldos={saldos} />
          )}
        </section>
      </div>
    </main>
  );
}
