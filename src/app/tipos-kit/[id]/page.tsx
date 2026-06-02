import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listarTodosInsumos } from "@/lib/insumos";
import { cardCls } from "@/app/_components/form-styles";
import { PageHeader } from "@/app/_components/page-header";
import { KitForm, type KitInicial } from "@/app/tipos-kit/_components/kit-form";

export const dynamic = "force-dynamic";

export default async function EditarKitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [kitRes, bomRes, insumos] = await Promise.all([
    supabase.from("tipo_kit").select("id, nome, descricao").eq("id", id).maybeSingle(),
    supabase
      .from("composicao")
      .select("insumo_id, quantidade, insumo(nome, unidade)")
      .eq("tipo_kit_id", id),
    listarTodosInsumos(supabase),
  ]);

  if (!kitRes.data) notFound();
  const itens = (bomRes.data ?? []).map((c) => {
    const ins = Array.isArray(c.insumo) ? c.insumo[0] : c.insumo;
    return {
      insumoId: c.insumo_id,
      nome: ins?.nome ?? "",
      unidade: ins?.unidade ?? "",
      quantidade: c.quantidade,
    };
  });

  const inicial: KitInicial = {
    id: kitRes.data.id,
    nome: kitRes.data.nome,
    descricao: kitRes.data.descricao ?? "",
    itens,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/tipos-kit"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar
      </Link>

      <PageHeader
        eyebrow="Tipos de kit"
        title="Editar kit"
        description="Ajuste o nome, a descrição e a composição (BOM). Salvar substitui o BOM atual."
      />

      <section className={cardCls}>
        <KitForm insumos={insumos} inicial={inicial} />
      </section>
    </main>
  );
}
