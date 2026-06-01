"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Minus, Plus, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import type { InsumoOption } from "@/app/tipos-kit/_components/insumo-picker";
import { MapearItem } from "@/app/entrada/_components/mapear-item";
import { RecusarDialog } from "@/app/entrada/_components/recusar-dialog";
import { confirmarRecebimento, recusarRecebimento } from "@/app/entrada/actions";
import { formatarCnpj, formatarDataHora, formatarMoeda } from "@/lib/fiscal/format";
import type { ItemConferencia, NotaConferencia, StatusNota } from "@/lib/fiscal/types";

type Linha = ItemConferencia & { recebido: number };

const ROTULO_STATUS: Record<StatusNota, string> = {
  consultada: "Aguardando conferência",
  recebida: "Recebida (conforme)",
  recebida_divergencia: "Recebida com divergência",
  recusada: "Entrega recusada",
};

function clamp(valor: number, max: number): number {
  if (Number.isNaN(valor) || valor < 0) return 0;
  return valor > max ? max : valor;
}

export function ConferenciaNota({
  nota,
  itens,
  insumos,
}: {
  nota: NotaConferencia;
  itens: ItemConferencia[];
  insumos: InsumoOption[];
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    itens.map((it) => ({ ...it, recebido: it.quantidadeRecebida ?? it.quantidade })),
  );
  const [status, setStatus] = useState<StatusNota>(nota.status);
  const [pending, startTransition] = useTransition();

  const aberta = status === "consultada";
  const naoMapeados = linhas.filter((l) => !l.insumoId);
  const temDivergencia = useMemo(
    () => linhas.some((l) => l.recebido < l.quantidade),
    [linhas],
  );
  const bloqueado = linhas.some((l) => l.recebido > 0 && !l.insumoId);

  function setRecebido(id: string, valor: number) {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, recebido: clamp(valor, l.quantidade) } : l)));
  }

  function onMapeado(id: string, insumoId: string, insumoNome: string) {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, insumoId, insumoNome } : l)));
  }

  function confirmar() {
    startTransition(async () => {
      const res = await confirmarRecebimento({
        notaId: nota.id,
        itens: linhas.map((l) => ({ notaItemId: l.id, recebido: l.recebido })),
      });
      if (res.ok) {
        setStatus((res.status as StatusNota) ?? "recebida");
        toast.success("Entrada registrada no estoque.");
      } else {
        toast.error(res.message ?? "Não foi possível registrar a entrada.");
      }
    });
  }

  function recusar(motivo: string) {
    startTransition(async () => {
      const res = await recusarRecebimento({ notaId: nota.id, motivo });
      if (res.ok) {
        setStatus("recusada");
        toast.success("Entrega recusada e registrada.");
      } else {
        toast.error(res.message ?? "Não foi possível recusar.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Cabecalho nota={nota} status={status} />

      {aberta && naoMapeados.length > 0 && (
        <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="text-sm font-semibold text-amber-900">
            {naoMapeados.length} item(ns) sem insumo — mapeie para receber
          </h3>
          {naoMapeados.map((item) => (
            <MapearItem
              key={item.id}
              item={item}
              emitenteCnpj={nota.emitenteCnpj}
              insumos={insumos}
              onMapeado={onMapeado}
            />
          ))}
        </section>
      )}

      <div className="overflow-hidden rounded-xl border border-bege-claro">
        <table className="w-full text-sm">
          <thead className="bg-bege-claro/40 text-left text-xs uppercase tracking-wide text-cinza/60">
            <tr>
              <th className="px-3 py-2.5 font-medium">Item / insumo</th>
              <th className="px-3 py-2.5 font-medium text-right">Nota</th>
              <th className="px-3 py-2.5 font-medium text-center">Recebido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bege-claro">
            {linhas.map((l) => {
              const divergente = l.recebido < l.quantidade;
              return (
                <tr key={l.id} className={cn(divergente && "bg-amber-50/40")}>
                  <td className="px-3 py-2.5">
                    <p className="text-preto">{l.descricao}</p>
                    <p className="text-xs text-cinza/60">
                      {l.insumoNome ? (
                        <span className="text-cinza">→ {l.insumoNome}</span>
                      ) : (
                        <span className="text-amber-700">a mapear</span>
                      )}
                      {" · "}cód. {l.codigo}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-cinza">
                    {l.quantidade} {l.unidade}
                  </td>
                  <td className="px-3 py-2.5">
                    {aberta ? (
                      <Stepper
                        valor={l.recebido}
                        max={l.quantidade}
                        disabled={!l.insumoId}
                        onChange={(v) => setRecebido(l.id, v)}
                      />
                    ) : (
                      <span className="block text-center tabular-nums">{l.quantidadeRecebida ?? "—"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {aberta && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RecusarDialog busy={pending} onConfirm={recusar} />
          {bloqueado ? (
            <button
              type="button"
              disabled
              className="rounded-md bg-preto px-5 py-2.5 text-sm font-medium text-white opacity-60"
            >
              Mapeie os itens para confirmar
            </button>
          ) : temDivergencia ? (
            <ConfirmDialog
              title="Quantidade menor que a nota"
              description="Você está registrando MENOS do que consta na nota. A diferença será REGISTRADA e os responsáveis pela compra irão apurar. Confirmar a entrada com a divergência?"
              confirmLabel="Registrar com divergência"
              triggerAriaLabel="Confirmar entrada com divergência"
              triggerClassName="rounded-md bg-preto px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cinza"
              busy={pending}
              onConfirm={confirmar}
            >
              Confirmar entrada
            </ConfirmDialog>
          ) : (
            <button
              type="button"
              onClick={confirmar}
              disabled={pending}
              className="rounded-md bg-preto px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cinza disabled:opacity-60"
            >
              Confirmar entrada
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Cabecalho({ nota, status }: { nota: NotaConferencia; status: StatusNota }) {
  const cor =
    status === "recusada"
      ? "bg-red-50 text-red-700"
      : status === "recebida_divergencia"
        ? "bg-amber-50 text-amber-800"
        : status === "recebida"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-bege-claro/60 text-cinza";
  return (
    <div className="rounded-xl border border-bege-claro bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-preto">{nota.emitenteNome}</p>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", cor)}>
          {status !== "consultada" && status !== "recebida" && <AlertTriangle className="size-3" aria-hidden />}
          {ROTULO_STATUS[status]}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Campo label="CNPJ emitente" valor={formatarCnpj(nota.emitenteCnpj)} />
        <Campo label="Nota / série" valor={`${Number(nota.numero)} / ${Number(nota.serie)}`} />
        <Campo label="Emissão" valor={formatarDataHora(nota.dataEmissao)} />
        <Campo label="Valor total" valor={formatarMoeda(nota.valorTotal)} />
        <Campo label="Destinatário (SPE)" valor={nota.destinatarioNome} />
      </dl>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-cinza/50">{label}</dt>
      <dd className="mt-0.5 text-sm text-preto">{valor}</dd>
    </div>
  );
}

function Stepper({
  valor,
  max,
  disabled,
  onChange,
}: {
  valor: number;
  max: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  const btn =
    "flex size-8 items-center justify-center rounded-md border border-bege-claro text-cinza transition-colors hover:bg-bege-claro disabled:opacity-40";
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label="Diminuir"
        className={btn}
        disabled={disabled || valor <= 0}
        onClick={() => onChange(valor - 1)}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        type="number"
        min={0}
        max={max}
        step="0.001"
        value={valor}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 rounded-md border border-bege-claro px-2 py-1.5 text-center text-sm tabular-nums focus-visible:border-bege focus-visible:outline-none disabled:opacity-40"
      />
      <button
        type="button"
        aria-label="Aumentar"
        className={btn}
        disabled={disabled || valor >= max}
        onClick={() => onChange(valor + 1)}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
