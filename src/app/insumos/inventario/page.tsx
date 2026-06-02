import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/app/_components/page-header";
import { ContagensList } from "@/app/insumos/inventario/_components/contagens-list";
import { NovaContagemDrawer } from "@/app/insumos/inventario/_components/nova-contagem-drawer";
import type { ContagemResumo } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const supabase = await createClient();
  const [contagensRes, empreendimentosRes] = await Promise.all([
    supabase.from("contagem_resumo").select("*").order("created_at", { ascending: false }),
    supabase.from("empreendimento").select("id, nome").order("nome"),
  ]);

  const contagens = (contagensRes.data ?? []) as ContagemResumo[];
  const empreendimentos = empreendimentosRes.data ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Insumos"
        title="Inventário"
        description="Conferência física × sistema. Conte o estoque e aplique para lançar o saldo de abertura ou ajustar diferenças."
        action={<NovaContagemDrawer empreendimentos={empreendimentos} />}
      />

      <ContagensList contagens={contagens} />
    </main>
  );
}
