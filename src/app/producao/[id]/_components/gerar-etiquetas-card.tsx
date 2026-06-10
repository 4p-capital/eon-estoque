"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { EtiquetasQr } from "@/app/producao/_components/etiquetas-qr";
import { TransferirInsumoDrawer } from "@/app/producao/_components/transferir-insumo-drawer";
import {
  FaltaInsumosPanel,
  type InsumoFaltante,
} from "@/app/producao/[id]/_components/falta-insumos-panel";
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
  const [transferindo, setTransferindo] = useState<InsumoFaltante | null>(null);
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

  // Insumos que NÃO cobrem a quantidade pedida — cada um com sua falta.
  const faltantes = useMemo<InsumoFaltante[]>(() => {
    if (qtdNum <= 0) return [];
    return disponibilidade
      .filter((d) => Number(d.limite) < qtdNum)
      .map((d) => {
        const necessario = qtdNum * Number(d.qtd_por_kit);
        const disponivel = Number(d.disponivel);
        return {
          insumoId: d.insumo_id,
          nome: d.insumo_nome,
          unidade: d.unidade,
          necessario,
          disponivel,
          falta: Math.max(Math.ceil(necessario - disponivel), 1),
        };
      })
      .sort((a, b) => b.falta - a.falta);
  }, [disponibilidade, qtdNum]);

  const bloqueado = semBom || faltantes.length > 0 || qtdNum <= 0;

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

        {!semBom && faltantes.length === 0 && (
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

        {faltantes.length > 0 && (
          <FaltaInsumosPanel
            qtd={qtdNum}
            faltantes={faltantes}
            podeTransferir={Boolean(empreendimento)}
            onTransferir={setTransferindo}
          />
        )}
      </div>

      {novas && novas.length > 0 && (
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <EtiquetasQr unidades={novas} rotulo={rotulo} />
        </div>
      )}

      {empreendimento && transferindo && (
        <TransferirInsumoDrawer
          open
          onOpenChange={(aberto) => {
            if (!aberto) setTransferindo(null);
          }}
          destino={{ id: empreendimento.id, nome: empreendimento.nome }}
          loteId={loteId}
          insumo={{
            id: transferindo.insumoId,
            nome: transferindo.nome,
            unidade: transferindo.unidade,
          }}
          sugestaoQtd={transferindo.falta}
        />
      )}
    </>
  );
}
