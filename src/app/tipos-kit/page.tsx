import { createClient } from "@/lib/supabase/server";
import { listarTodosInsumos } from "@/lib/insumos";
import { PageHeader } from "@/app/_components/page-header";
import { KitsList, type KitRow } from "@/app/tipos-kit/_components/kits-list";
import { NovoKitDrawer } from "@/app/tipos-kit/_components/novo-kit-drawer";
import type { KitPossivel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TiposKitPage() {
  const supabase = await createClient();
  const [kitsRes, tiposRes, composRes, insumos] = await Promise.all([
    supabase.from("kits_possiveis_view").select("*").order("tipo_kit_nome"),
    supabase.from("tipo_kit").select("id, descricao"),
    supabase.from("composicao").select("tipo_kit_id"),
    listarTodosInsumos(supabase),
  ]);

  const kits = (kitsRes.data ?? []) as KitPossivel[];
  const descricaoPorId = new Map(
    (tiposRes.data ?? []).map((t) => [t.id, t.descricao as string | null]),
  );
  const contagemBom = new Map<string, number>();
  for (const c of composRes.data ?? []) {
    if (!c.tipo_kit_id) continue;
    contagemBom.set(c.tipo_kit_id, (contagemBom.get(c.tipo_kit_id) ?? 0) + 1);
  }

  const rows: KitRow[] = kits.map((k) => ({
    id: k.tipo_kit_id,
    nome: k.tipo_kit_nome,
    descricao: k.tipo_kit_id ? descricaoPorId.get(k.tipo_kit_id) ?? null : null,
    qtdInsumos: k.tipo_kit_id ? contagemBom.get(k.tipo_kit_id) ?? 0 : 0,
    qtdPossivel: k.qtd_possivel ?? 0,
    gargalo: k.insumo_gargalo_nome,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Tipos de kit"
        title="Tipos de kit"
        description="A receita (BOM) de cada kit e quantos dá para montar agora."
        action={<NovoKitDrawer insumos={insumos} />}
      />

      <KitsList kits={rows} />
    </main>
  );
}
