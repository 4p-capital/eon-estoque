import { createClient } from "@/lib/supabase/server";
import { cardCls } from "@/app/_components/form-styles";
import { KitForm } from "@/app/tipos-kit/_components/kit-form";
import { KitsList } from "@/app/tipos-kit/_components/kits-list";
import type { KitPossivel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TiposKitPage() {
  const supabase = await createClient();
  const [kitsRes, insumosRes] = await Promise.all([
    supabase.from("kits_possiveis_view").select("*").order("tipo_kit_nome"),
    supabase.from("insumo").select("id, nome, unidade").order("nome"),
  ]);

  const kits = (kitsRes.data ?? []) as KitPossivel[];
  const insumos = insumosRes.data ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-preto">Tipos de kit</h1>
        <p className="mt-1 text-sm text-cinza/70">
          A receita (BOM) de cada kit. Adicione insumos buscando os existentes ou
          criando novos na hora.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className={cardCls}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-cinza/60">
            Novo kit
          </h2>
          <KitForm insumos={insumos} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cinza/60">
            Kits cadastrados
          </h2>
          <KitsList kits={kits} />
        </section>
      </div>
    </main>
  );
}
