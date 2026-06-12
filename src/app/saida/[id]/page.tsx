import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/app/_components/page-header";
import { RecebimentoCard, type BipeEstranhoRow } from "@/app/saida/[id]/_components/recebimento-card";
import { SaidaDetalhe } from "@/app/saida/[id]/_components/saida-detalhe";
import { Button } from "@/components/ui/button";
import { getSessao } from "@/lib/auth/sessao";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SaidaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const sessao = await getSessao();
  const [saidaRes, kitsRes, estranhosRes] = await Promise.all([
    supabase.from("saida_resumo_view").select("*").eq("saida_id", id).maybeSingle(),
    supabase
      .from("unidade_kit")
      .select("numero, status, entregue_em, lote:lote_id(tipo_kit:tipo_kit_id(nome)), movimentacao(tipo, data)")
      .eq("saida_id", id)
      .order("numero", { ascending: false }),
    supabase
      .from("saida_bipe_estranho")
      .select("qr_code, motivo, bipado_em")
      .eq("saida_id", id)
      .order("bipado_em", { ascending: true }),
  ]);

  const saida = saidaRes.data;
  if (!saida) notFound();
  const kits = (kitsRes.data ?? []).map((k) => ({
    numero: k.numero,
    tipo: k.lote?.tipo_kit?.nome ?? "Kit",
    data: (k.movimentacao ?? []).find((m) => m.tipo === "saida_kit")?.data ?? null,
    recebidoEm: k.status === "entregue" ? k.entregue_em : null,
  }));
  const mostrarRecebimento = saida.status !== "aberta" && saida.status !== "cancelada";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <PageHeader
        eyebrow={`Expedição · OS #${saida.numero ?? "—"}`}
        title={saida.empreendimento_nome ?? "Saída"}
        description={
          saida.destino
            ? `Destino: ${saida.destino}`
            : "Bipe o QR de cada kit para expedir nesta remessa."
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/saida">
              <ArrowLeft className="size-4" aria-hidden />
              Voltar
            </Link>
          </Button>
        }
      />
      <div className="space-y-6">
        {mostrarRecebimento && (
          <RecebimentoCard
            info={{
              saidaId: id,
              numero: saida.numero,
              status: saida.status,
              empreendimentoNome: saida.empreendimento_nome,
              token: saida.recebimento_token,
              expiraEm: saida.recebimento_expira_em,
              recebidoEm: saida.recebido_em,
              recebedorNome: saida.recebedor_nome,
              recebedorCpfMascarado: saida.recebedor_cpf_mascarado,
              recusaMotivo: saida.recusa_motivo,
              qtdKits: Number(saida.qtd_kits ?? 0),
              qtdEntregues: Number(saida.qtd_entregues ?? 0),
              qtdEstranhos: Number(saida.qtd_estranhos ?? 0),
            }}
            estranhos={(estranhosRes.data ?? []) as BipeEstranhoRow[]}
            isGerente={sessao?.papel === "galpao_admin"}
          />
        )}
        <SaidaDetalhe
          saidaId={id}
          status={saida.status ?? "aberta"}
          observacao={saida.observacao}
          kitsIniciais={kits}
        />
      </div>
    </main>
  );
}
