"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Tag as TagIcon, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { EtiquetasQr } from "@/app/producao/_components/etiquetas-qr";
import { TransferirInsumoDrawer } from "@/app/producao/_components/transferir-insumo-drawer";
import { gerarEtiquetas, type UnidadeProduzida } from "@/app/producao/actions";
import type { BomDisponibilidade } from "@/lib/types";

type Props = {
  loteId: string;
  empreendimento: { id: string; nome: string } | null;
  rotulo: string;
  pendentes: UnidadeProduzida[];
  disponibilidade: BomDisponibilidade[];
};

// Card "Gerar etiquetas" com a TRAVA de estoque: bloqueia imprimir acima do
// disponível (saldo − reservado pelas pendentes) e oferece a transferência de
// insumo de outra SPE como saída. O servidor revalida (gerar_etiquetas).
export function GerarEtiquetasCard({
  loteId,
  empreendimento,
  rotulo,
  pendentes,
  disponibilidade,
}: Props) {
  const router = useRouter();
  const [qtd, setQtd] = useState("1");
  const [novas, setNovas] = useState<UnidadeProduzida[] | null>(null);
  const [transferirAberto, setTransferirAberto] = useState(false);
  const [pendente, startTransition] = useTransition();

  const semBom = disponibilidade.length === 0;
  const capacidade = useMemo(
    () => (semBom ? 0 : Math.min(...disponibilidade.map((d) => Number(d.limite)))),
    [disponibilidade, semBom],
  );
  const gargalo = useMemo(
    () =>
      [...disponibilidade].sort((a, b) => Number(a.limite) - Number(b.limite))[0] ?? null,
    [disponibilidade],
  );

  const qtdNum = Math.max(0, Math.floor(Number(qtd) || 0));
  const excede = qtdNum > capacidade;
  const necessario = gargalo ? qtdNum * Number(gargalo.qtd_por_kit) : 0;
  const deficit = gargalo
    ? Math.max(Math.ceil(necessario - Number(gargalo.disponivel)), 1)
    : 1;
  const bloqueado = semBom || excede || qtdNum <= 0;

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await gerarEtiquetas({ loteId, quantidade: qtd });
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      setNovas(res.unidades);
      toast.success(`${res.unidades.length} etiqueta(s) gerada(s). Clique em Imprimir.`);
      router.refresh();
    });
  }

  function reimprimirPendentes() {
    if (pendentes.length === 0) {
      toast.error("Nenhuma etiqueta pendente para reimprimir.");
      return;
    }
    setNovas(pendentes.map((u) => ({ numero: u.numero, qr_code: u.qr_code })));
    toast.success(`${pendentes.length} etiqueta(s) prontas para reimpressão.`);
  }

  return (
    <>
      <div className="space-y-3 rounded-xl bg-card p-5 shadow-sm">
        <form onSubmit={gerar} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="qtd" className={labelCls}>
              Gerar etiquetas
            </label>
            <input
              id="qtd"
              type="number"
              min={1}
              step={1}
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              className={`${inputCls} w-32`}
            />
          </div>
          <Button type="submit" disabled={pendente || bloqueado}>
            <TagIcon className="size-4" aria-hidden />
            {pendente ? "Gerando…" : "Gerar e imprimir"}
          </Button>
          {pendentes.length > 0 && (
            <Button type="button" variant="outline" onClick={reimprimirPendentes}>
              Reimprimir pendentes ({pendentes.length})
            </Button>
          )}
        </form>

        {!semBom && !excede && (
          <p className="text-xs text-muted-foreground">
            O estoque deste empreendimento comporta{" "}
            <span className="font-semibold text-foreground">{capacidade}</span> etiqueta(s)
            {gargalo && capacidade > 0 && <> — gargalo: {gargalo.insumo_nome}</>}. Etiquetas
            pendentes já contam como reserva.
          </p>
        )}

        {semBom && (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Este tipo de kit não tem composição (BOM) cadastrada — sem BOM não dá para validar o
            estoque nem imprimir etiquetas.
          </p>
        )}

        {!semBom && excede && gargalo && (
          <div className="space-y-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <p className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Estoque insuficiente para {qtdNum} etiqueta(s): o disponível comporta{" "}
                <strong>{capacidade}</strong>. Gargalo: <strong>{gargalo.insumo_nome}</strong>{" "}
                (disponível {Number(gargalo.disponivel)} {gargalo.unidade}, necessário {necessario}{" "}
                {gargalo.unidade}).
              </span>
            </p>
            {empreendimento && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransferirAberto(true)}
              >
                <ArrowRightLeft className="size-4" aria-hidden />
                Transferir insumo de outra SPE
              </Button>
            )}
          </div>
        )}
      </div>

      {novas && novas.length > 0 && (
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <EtiquetasQr unidades={novas} rotulo={rotulo} />
        </div>
      )}

      {empreendimento && gargalo && (
        <TransferirInsumoDrawer
          open={transferirAberto}
          onOpenChange={setTransferirAberto}
          destino={{ id: empreendimento.id, nome: empreendimento.nome }}
          loteId={loteId}
          insumo={{
            id: gargalo.insumo_id,
            nome: gargalo.insumo_nome,
            unidade: gargalo.unidade,
          }}
          sugestaoQtd={deficit}
        />
      )}
    </>
  );
}
