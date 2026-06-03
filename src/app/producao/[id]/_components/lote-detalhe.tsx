"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { Tag, type TagColor } from "@/components/ui/tag";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { EtiquetasQr } from "@/app/producao/_components/etiquetas-qr";
import { LoteStats } from "@/app/producao/_components/lote-stats";
import {
  cancelarLote,
  finalizarLote,
  gerarEtiquetas,
  type UnidadeProduzida,
} from "@/app/producao/actions";
import type { LoteResumo } from "@/lib/types";

export type UnidadeRow = { numero: number; qr_code: string; status: string };

const STATUS: Record<string, { label: string; cor: TagColor }> = {
  pendente: { label: "Pendente", cor: "amber" },
  em_estoque: { label: "No depósito", cor: "green" },
  expedido: { label: "Expedido", cor: "blue" },
  entregue: { label: "Entregue", cor: "teal" },
  cancelado: { label: "Cancelado", cor: "slate" },
};

type Props = { lote: LoteResumo; unidades: UnidadeRow[]; rotulo: string };

export function LoteDetalhe({ lote, unidades, rotulo }: Props) {
  const router = useRouter();
  const [qtd, setQtd] = useState("1");
  const [novas, setNovas] = useState<UnidadeProduzida[] | null>(null);
  const [pendente, startTransition] = useTransition();

  const aberto = lote.status === "aberto";
  const gap = Number(lote.gap ?? 0);
  const pendentes = useMemo(() => unidades.filter((u) => u.status === "pendente"), [unidades]);

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await gerarEtiquetas({ loteId: lote.lote_id as string, quantidade: qtd });
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

  function finalizar() {
    startTransition(async () => {
      const res = await finalizarLote(lote.lote_id as string);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Lote finalizado.");
      router.push("/producao");
    });
  }

  function cancelar() {
    startTransition(async () => {
      const res = await cancelarLote(lote.lote_id as string);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Lote cancelado.");
      router.push("/producao");
    });
  }

  return (
    <div className="space-y-6">
      <LoteStats
        impressas={Number(lote.qtd_impressas ?? 0)}
        bipadas={Number(lote.qtd_bipadas ?? 0)}
        pendentes={Number(lote.qtd_pendentes ?? 0)}
        gap={gap}
        meta={lote.meta}
      />

      {aberto && (
        <form onSubmit={gerar} className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-5 shadow-sm">
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
          <Button type="submit" disabled={pendente}>
            <TagIcon className="size-4" aria-hidden />
            {pendente ? "Gerando…" : "Gerar e imprimir"}
          </Button>
          {pendentes.length > 0 && (
            <Button type="button" variant="outline" onClick={reimprimirPendentes}>
              Reimprimir pendentes ({pendentes.length})
            </Button>
          )}
        </form>
      )}

      {novas && novas.length > 0 && (
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <EtiquetasQr unidades={novas} rotulo={rotulo} />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Unidades ({unidades.length})
        </h2>
        {unidades.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma etiqueta gerada ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Kit</th>
                  <th className="px-4 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((u, i) => {
                  const s = STATUS[u.status] ?? { label: u.status, cor: "slate" as TagColor };
                  return (
                    <tr key={u.qr_code} className="border-t border-border">
                      <td className="px-4 py-2 font-medium text-foreground">KIT {i + 1}</td>
                      <td className="px-4 py-2 text-right">
                        <Tag color={s.cor}>{s.label}</Tag>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {aberto && (
        <div className="flex flex-wrap gap-2">
          <ConfirmDialog
            title="Finalizar lote?"
            description={
              gap > 0
                ? `Há ${gap} etiqueta(s) impressa(s) que ainda NÃO foram bipadas. O lote será finalizado mesmo assim, registrando essa divergência.`
                : "O lote será finalizado e não aceitará novas etiquetas."
            }
            confirmLabel="Finalizar"
            triggerAriaLabel="Finalizar lote"
            busy={pendente}
            onConfirm={finalizar}
            triggerClassName="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <CheckCircle2 className="size-4" aria-hidden />
            Finalizar lote
          </ConfirmDialog>

          <ConfirmDialog
            title="Cancelar lote?"
            description="As etiquetas pendentes (não bipadas) serão canceladas. Unidades já bipadas não são afetadas."
            confirmLabel="Cancelar lote"
            cancelLabel="Voltar"
            destructive
            triggerAriaLabel="Cancelar lote"
            busy={pendente}
            onConfirm={cancelar}
            triggerClassName="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Ban className="size-4" aria-hidden />
            Cancelar lote
          </ConfirmDialog>
        </div>
      )}
    </div>
  );
}
