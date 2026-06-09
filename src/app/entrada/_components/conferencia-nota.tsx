"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Minus, Plus, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag } from "@/components/ui/tag";
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

// Só dígitos, p/ comparar o NCM da nota com o do insumo (formatos podem diferir).
function soDigitos(ncm: string | null): string {
  return (ncm ?? "").replace(/\D/g, "");
}

// Item já mapeado cujo NCM da nota diverge do NCM cadastrado no insumo.
function temDivergenciaNcm(l: Linha): boolean {
  const nota = soDigitos(l.ncm);
  const insumo = soDigitos(l.insumoNcm);
  return Boolean(l.insumoId) && nota.length > 0 && insumo.length > 0 && nota !== insumo;
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
        <section className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <h3 className="text-sm font-semibold text-foreground">
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

      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">Item / insumo</th>
              <th className="px-3 py-2.5 font-medium text-right">Nota</th>
              <th className="px-3 py-2.5 font-medium text-center">Recebido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {linhas.map((l) => {
              const divergente = l.recebido < l.quantidade;
              return (
                <tr key={l.id} className={cn(divergente && "bg-warning/10")}>
                  <td className="px-3 py-2.5">
                    <p className="text-foreground">{l.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.insumoNome ? (
                        <span className="text-foreground">→ {l.insumoNome}</span>
                      ) : (
                        <span className="text-warning">a mapear</span>
                      )}
                      {" · "}cód. {l.codigo}
                    </p>
                    {temDivergenciaNcm(l) && (
                      <Tag
                        color="amber"
                        className="mt-1"
                        title={`NCM da nota (${l.ncm}) diferente do cadastrado no insumo (${l.insumoNcm}).`}
                      >
                        <AlertTriangle aria-hidden />
                        NCM divergente
                      </Tag>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
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
            <Button type="button" disabled>
              Mapeie os itens para confirmar
            </Button>
          ) : temDivergencia ? (
            <ConfirmDialog
              title="Atenção: quantidade menor que a nota"
              description="Você está registrando MENOS do que consta na nota. A diferença será REGISTRADA com seu nome e os responsáveis pela compra irão apurar. Confirmar a entrada com a divergência?"
              confirmLabel="Registrar com divergência"
              destructive
              triggerAriaLabel="Confirmar entrada com divergência"
              triggerClassName="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              busy={pending}
              onConfirm={confirmar}
            >
              Confirmar entrada
            </ConfirmDialog>
          ) : (
            <Button type="button" onClick={confirmar} disabled={pending}>
              Confirmar entrada
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Cabecalho({ nota, status }: { nota: NotaConferencia; status: StatusNota }) {
  const cor =
    status === "recusada"
      ? "bg-destructive/15 text-destructive border-transparent"
      : status === "recebida_divergencia"
        ? "bg-warning/15 text-warning border-transparent"
        : status === "recebida"
          ? "bg-success/15 text-success border-transparent"
          : "bg-secondary text-secondary-foreground border-transparent";
  return (
    <div className="rounded-xl bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{nota.emitenteNome}</p>
        <Badge className={cor}>
          {status !== "consultada" && status !== "recebida" && <AlertTriangle className="size-3" aria-hidden />}
          {ROTULO_STATUS[status]}
        </Badge>
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
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{valor}</dd>
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
  return (
    <div className="flex items-center justify-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Diminuir"
        disabled={disabled || valor <= 0}
        onClick={() => onChange(valor - 1)}
      >
        <Minus className="size-4" aria-hidden />
      </Button>
      <input
        type="number"
        min={0}
        max={max}
        step="0.001"
        value={valor}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm text-foreground tabular-nums focus-visible:border-ring focus-visible:outline-none disabled:opacity-40"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Aumentar"
        disabled={disabled || valor >= max}
        onClick={() => onChange(valor + 1)}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
