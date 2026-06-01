import { createClient } from "@/lib/supabase/server";
import { cardCls } from "@/app/_components/form-styles";
import { LeitorEntrada } from "@/app/entrada/_components/leitor-entrada";

export const dynamic = "force-dynamic";

export default async function EntradaPage() {
  const supabase = await createClient();
  const { data: insumos } = await supabase
    .from("insumo")
    .select("id, nome, unidade")
    .order("nome");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-preto">Entrada de mercadoria</h1>
        <p className="mt-1 text-sm text-cinza/70">
          Bipe o código de barras da DANFE — o sistema busca o XML na SEFAZ, casa cada item com o
          insumo interno e registra a entrada (com a divergência, se houver).
        </p>
      </header>

      <section className={cardCls}>
        <LeitorEntrada insumos={insumos ?? []} />
      </section>
    </main>
  );
}
