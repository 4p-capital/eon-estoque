"use client";

import { useRef, useState, useTransition } from "react";
import { ScanLine, Truck } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { Tag, type TagColor } from "@/components/ui/tag";
import { consultarKit, type KitConsulta } from "@/app/producao/actions";

const STATUS: Record<string, { label: string; cor: TagColor }> = {
  pendente: { label: "Em produção", cor: "amber" },
  em_estoque: { label: "No depósito", cor: "green" },
  expedido: { label: "Expedido", cor: "blue" },
  entregue: { label: "Entregue", cor: "teal" },
  cancelado: { label: "Cancelado", cor: "slate" },
};

const MOV_LABEL: Record<string, string> = {
  entrada_kit: "Entrada no depósito",
  saida_kit: "Saída",
  baixa_producao: "Baixa de insumo",
  ajuste: "Ajuste",
};

function dataHoraBR(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function ConsultarKit() {
  const [qr, setQr] = useState("");
  const [kit, setKit] = useState<KitConsulta | null>(null);
  const [pendente, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = qr.trim();
    if (!code) return;
    startTransition(async () => {
      const res = await consultarKit(code);
      if (res.status === "error") {
        toast.error(res.message);
        setKit(null);
      } else {
        setKit(res.kit);
      }
      setQr("");
      inputRef.current?.focus();
    });
  }

  const s = kit ? (STATUS[kit.status] ?? { label: kit.status, cor: "slate" as TagColor }) : null;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-xl bg-card p-5 shadow-sm">
        <label htmlFor="qr" className={labelCls}>
          Bipe ou digite o QR do kit
        </label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <ScanLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              id="qr"
              value={qr}
              onChange={(e) => setQr(e.target.value)}
              placeholder="Bipe o QR…"
              aria-label="Código QR do kit"
              autoFocus
              autoComplete="off"
              className={`${inputCls} mt-0 pl-9`}
            />
          </div>
          <Button type="submit" disabled={pendente}>
            {pendente ? "Consultando…" : "Consultar"}
          </Button>
        </div>
      </form>

      {kit && s && (
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Kit {kit.numero}
              </p>
              <h2 className="font-heading text-lg font-semibold text-foreground">{kit.tipoKit}</h2>
            </div>
            <Tag color={s.cor}>{s.label}</Tag>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Linha rotulo="Empreendimento" valor={kit.empreendimento ?? "—"} />
            <Linha rotulo="Lote" valor={kit.loteId.slice(0, 8).toUpperCase()} />
            <Linha rotulo="Fabricação" valor={dataHoraBR(kit.fabricadoEm)} />
            <Linha rotulo="Entrada no depósito" valor={dataHoraBR(kit.entradaEm)} />
          </dl>

          {kit.saida && (
            <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Truck className="size-3.5" aria-hidden /> Expedição
              </h3>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Linha rotulo="SPE de destino" valor={kit.saida.empreendimentoNome ?? "—"} />
                <Linha rotulo="Destino" valor={kit.saida.destino ?? "—"} />
                <Linha rotulo="Saída em" valor={dataHoraBR(kit.saida.data)} />
              </dl>
            </div>
          )}

          <h3 className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Movimentações
          </h3>
          {kit.movimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <ul className="space-y-1.5">
              {kit.movimentos.map((m, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">{MOV_LABEL[m.tipo] ?? m.tipo}</span>
                  {m.observacao && (
                    <span className="truncate text-xs text-muted-foreground">{m.observacao}</span>
                  )}
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {dataHoraBR(m.data)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="text-right font-medium text-foreground">{valor}</dd>
    </div>
  );
}
