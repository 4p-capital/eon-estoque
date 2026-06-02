import { createClient } from "@/lib/supabase/server";
import { InsumosBrowser, type SpeCard } from "@/app/insumos/_components/insumos-browser";
import { PageHeader } from "@/app/_components/page-header";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  const supabase = await createClient();
  const { data: spesRaw } = await supabase
    .from("spe")
    .select("razao_social, cnpj, empreendimento_id")
    .eq("ativo", true)
    .not("empreendimento_id", "is", null)
    .order("razao_social");

  const spes: SpeCard[] = await Promise.all(
    (spesRaw ?? [])
      .filter((s) => s.empreendimento_id)
      .map(async (s) => {
        const empreendimentoId = s.empreendimento_id as string;
        const { count } = await supabase
          .from("saldo_insumo_empreendimento")
          .select("insumo_id", { count: "exact", head: true })
          .eq("empreendimento_id", empreendimentoId);
        return {
          empreendimentoId,
          razaoSocial: s.razao_social,
          cnpj: s.cnpj,
          qtdInsumos: count ?? 0,
        };
      }),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Insumos"
        title="Estoque"
        description="Insumos com saldo em estoque — geral ou por SPE. A entrada de material é feita em Entrada."
      />

      <InsumosBrowser spes={spes} />
    </main>
  );
}
