import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listarTodosInsumos } from "@/lib/insumos";
import { PageHeader } from "@/app/_components/page-header";
import { ContagemEditor } from "@/app/insumos/inventario/[id]/_components/contagem-editor";

export const dynamic = "force-dynamic";

export default async function ContagemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contagem } = await supabase
    .from("contagem")
    .select("id, empreendimento_id, status, regiao, empreendimento:empreendimento_id(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!contagem) notFound();

  const [itensRes, saldosRes, insumos] = await Promise.all([
    supabase
      .from("contagem_item")
      .select("insumo_id, qtd_contada, saldo_sistema, insumo(nome, unidade)")
      .eq("contagem_id", id),
    supabase
      .from("saldo_insumo_empreendimento")
      .select("insumo_id, saldo")
      .eq("empreendimento_id", contagem.empreendimento_id),
    listarTodosInsumos(supabase),
  ]);

  const saldos: Record<string, number> = {};
  for (const r of saldosRes.data ?? []) {
    if (r.insumo_id) saldos[r.insumo_id] = Number(r.saldo ?? 0);
  }

  const itens = (itensRes.data ?? []).map((r) => {
    const ins = Array.isArray(r.insumo) ? r.insumo[0] : r.insumo;
    return {
      insumoId: r.insumo_id,
      nome: ins?.nome ?? "",
      unidade: ins?.unidade ?? "",
      qtdContada: Number(r.qtd_contada),
      saldoSnapshot: r.saldo_sistema == null ? null : Number(r.saldo_sistema),
    };
  });

  const emp = Array.isArray(contagem.empreendimento)
    ? contagem.empreendimento[0]
    : contagem.empreendimento;
  const empNome = emp?.nome ?? "Contagem";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/insumos/inventario"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Inventário
      </Link>

      <PageHeader
        eyebrow="Inventário"
        title={empNome}
        description={
          contagem.regiao
            ? `Região: ${contagem.regiao}. Conte o físico de cada insumo e aplique.`
            : "Conte o físico de cada insumo e aplique para ajustar o estoque."
        }
      />

      <ContagemEditor
        contagemId={id}
        status={contagem.status}
        itensIniciais={itens}
        saldos={saldos}
        insumos={insumos}
      />
    </main>
  );
}
