import { createClient } from "@/lib/supabase/server";
import { listarTodosInsumos } from "@/lib/insumos";
import { cardCls } from "@/app/_components/form-styles";
import { PageHeader } from "@/app/_components/page-header";
import { LeitorEntrada } from "@/app/entrada/_components/leitor-entrada";

export const dynamic = "force-dynamic";

export default async function EntradaPage() {
  const supabase = await createClient();
  const insumos = await listarTodosInsumos(supabase);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader
        eyebrow="Entrada"
        title="Entrada de mercadoria"
        description="Bipe o código de barras da DANFE — o sistema busca o XML na SEFAZ, casa cada item com o insumo interno e registra a entrada (com a divergência, se houver)."
      />

      <section className={cardCls}>
        <LeitorEntrada insumos={insumos ?? []} />
      </section>
    </main>
  );
}
