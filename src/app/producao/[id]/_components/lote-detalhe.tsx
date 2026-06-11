"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Tag, type TagColor } from "@/components/ui/tag";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { CancelarEtiquetasDialog } from "@/app/producao/[id]/_components/cancelar-etiquetas-dialog";
import { GerarEtiquetasCard } from "@/app/producao/[id]/_components/gerar-etiquetas-card";
import { LoteStats } from "@/app/producao/_components/lote-stats";
import { cancelarLote, finalizarLote } from "@/app/producao/actions";
import type { BomDisponibilidade, LoteResumo } from "@/lib/types";

export type UnidadeRow = { numero: number; qr_code: string; status: string };

const STATUS: Record<string, { label: string; cor: TagColor }> = {
  pendente: { label: "Pendente", cor: "amber" },
  em_estoque: { label: "No depósito", cor: "green" },
  expedido: { label: "Expedido", cor: "blue" },
  entregue: { label: "Entregue", cor: "teal" },
  cancelado: { label: "Cancelado", cor: "slate" },
};

type Props = {
  lote: LoteResumo;
  unidades: UnidadeRow[];
  rotulo: string;
  disponibilidade: BomDisponibilidade[];
  isGerente: boolean; // galpao_admin: cancelamentos são dele; o banco revalida
};

export function LoteDetalhe({ lote, unidades, rotulo, disponibilidade, isGerente }: Props) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  const aberto = lote.status === "aberto";
  const finalizado = lote.status === "finalizado";
  const gap = Number(lote.gap ?? 0);
  const pendentes = useMemo(() => unidades.filter((u) => u.status === "pendente"), [unidades]);
  const mostrarCancelarEtiquetas = isGerente && (aberto || finalizado) && pendentes.length > 0;

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
        <GerarEtiquetasCard
          loteId={lote.lote_id as string}
          empreendimento={
            lote.empreendimento_id && lote.empreendimento_nome
              ? { id: lote.empreendimento_id, nome: lote.empreendimento_nome }
              : null
          }
          rotulo={rotulo}
          pendentes={pendentes.map((u) => ({ numero: u.numero, qr_code: u.qr_code }))}
          disponibilidade={disponibilidade}
        />
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

      {(aberto || mostrarCancelarEtiquetas) && (
        <div className="flex flex-wrap gap-2">
          {aberto && (
            <ConfirmDialog
              title="Finalizar lote?"
              description={
                gap > 0
                  ? `Há ${gap} etiqueta(s) impressa(s) que ainda NÃO foram bipadas. Elas continuam reservando insumo até serem bipadas — ou canceladas pelo gerente, se foi sobra/erro de impressão. O lote será finalizado registrando essa divergência.`
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
          )}

          {mostrarCancelarEtiquetas && (
            <CancelarEtiquetasDialog
              loteId={lote.lote_id as string}
              pendentes={pendentes.length}
            />
          )}

          {aberto && isGerente && (
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
          )}
        </div>
      )}
    </div>
  );
}
