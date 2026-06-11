import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/app/_components/page-header";
import { LoteDetalhe, type UnidadeRow } from "@/app/producao/[id]/_components/lote-detalhe";
import { Button } from "@/components/ui/button";
import { getSessao } from "@/lib/auth/sessao";
import { createClient } from "@/lib/supabase/server";
import type { BomDisponibilidade, LoteResumo } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const sessao = await getSessao();

  const [loteRes, unidadesRes] = await Promise.all([
    supabase.from("lote_resumo_view").select("*").eq("lote_id", id).maybeSingle(),
    supabase
      .from("unidade_kit")
      .select("numero, qr_code, status")
      .eq("lote_id", id)
      .order("numero", { ascending: true }),
  ]);

  const lote = loteRes.data as LoteResumo | null;
  if (!lote) notFound();

  const unidades = (unidadesRes.data ?? []) as UnidadeRow[];
  const rotulo = lote.empreendimento_nome ?? lote.tipo_kit_nome ?? "Kit";

  // Disponibilidade do BOM (saldo − reservado) só importa enquanto o lote
  // ainda imprime etiquetas.
  let disponibilidade: BomDisponibilidade[] = [];
  if (lote.status === "aberto" && lote.tipo_kit_id && lote.empreendimento_id) {
    const { data, error } = await supabase.rpc("bom_disponibilidade", {
      p_tipo_kit_id: lote.tipo_kit_id,
      p_empreendimento_id: lote.empreendimento_id,
    });
    if (error) console.error("[producao] bom_disponibilidade", error);
    disponibilidade = data ?? [];
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader
        eyebrow="Produção · lote"
        title={lote.tipo_kit_nome ?? "Lote"}
        description={lote.empreendimento_nome ?? undefined}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/producao">
              <ArrowLeft className="size-4" aria-hidden />
              Voltar
            </Link>
          </Button>
        }
      />
      <LoteDetalhe
        lote={lote}
        unidades={unidades}
        rotulo={rotulo}
        disponibilidade={disponibilidade}
        isGerente={sessao?.papel === "galpao_admin"}
      />
    </main>
  );
}
