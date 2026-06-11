"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  listarOrigensDisponiveis,
  transferirInsumo,
  type OrigemTransferencia,
} from "@/app/producao/transferencia-actions";

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destino: { id: string; nome: string };
  loteId: string;
  insumo: { id: string; nome: string; unidade: string };
  sugestaoQtd: number;
};

// Drawer de produção cruzada: puxa insumo de OUTRA SPE do mesmo cliente para o
// empreendimento do lote. A transferência é registrada no livro-razão e cria
// uma pendência de reposição persistente para a SPE de origem.
export function TransferirInsumoDrawer({ open, onOpenChange, ...form }: DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(32rem,100vw)] gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading">Transferir insumo de outra SPE</SheetTitle>
          <SheetDescription>
            Transfere <span className="font-medium text-foreground">{form.insumo.nome}</span> de
            outra SPE para <span className="font-medium text-foreground">{form.destino.nome}</span>
            . A movimentação fica registrada e a SPE de origem ganha um lembrete de reposição.
          </SheetDescription>
        </SheetHeader>
        {/* Montado só com o sheet aberto: cada abertura nasce com estado fresco. */}
        {open && <TransferirForm {...form} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

type FormProps = Omit<DrawerProps, "open" | "onOpenChange"> & { onDone: () => void };

function TransferirForm({ destino, loteId, insumo, sugestaoQtd, onDone }: FormProps) {
  const router = useRouter();
  const [origens, setOrigens] = useState<OrigemTransferencia[] | null>(null);
  const [tenantNome, setTenantNome] = useState<string | null>(null);
  const [origemId, setOrigemId] = useState("");
  const [quantidade, setQuantidade] = useState(String(sugestaoQtd));
  const [motivo, setMotivo] = useState("");
  const [pendente, startTransition] = useTransition();

  useEffect(() => {
    let ativo = true;
    listarOrigensDisponiveis(insumo.id, destino.id).then((res) => {
      if (!ativo) return;
      if (res.status === "error") {
        toast.error(res.message);
        setOrigens([]);
        return;
      }
      setOrigens(res.origens);
      setTenantNome(res.tenantNome);
    });
    return () => {
      ativo = false;
    };
  }, [insumo.id, destino.id]);

  const origemSelecionada = origens?.find((o) => o.empreendimentoId === origemId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origemId) {
      toast.error("Selecione a SPE de origem.");
      return;
    }
    startTransition(async () => {
      const res = await transferirInsumo({
        insumoId: insumo.id,
        origemId,
        destinoId: destino.id,
        quantidade,
        motivo: motivo || undefined,
        loteId,
      });
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success(
        "Transferência registrada. Ficou uma pendência de reposição para a SPE de origem.",
      );
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4">
      {/* Resumo da falta: o quê, quanto e para onde. */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{insumo.nome}</p>
          <p className="truncate text-xs text-muted-foreground">para {destino.nome}</p>
        </div>
        <Tag color="red">
          falta {sugestaoQtd} {insumo.unidade}
        </Tag>
      </div>

      <fieldset>
        <legend className={labelCls}>De onde tirar (SPE de origem)</legend>
        {origens === null ? (
          <p className="text-sm text-muted-foreground">Buscando estoque das outras SPEs…</p>
        ) : origens.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Nenhuma outra SPE{tenantNome ? ` de ${tenantNome}` : ""} tem saldo deste insumo — a
            transferência só é permitida entre SPEs do mesmo cliente. Registre uma entrada de NF
            ou um ajuste de inventário na SPE que vai ceder.
          </p>
        ) : (
          <div className="space-y-2">
            {origens.map((o) =>
              o.disponivel > 0 ? (
                <button
                  key={o.empreendimentoId}
                  type="button"
                  onClick={() => setOrigemId(o.empreendimentoId)}
                  aria-pressed={o.empreendimentoId === origemId}
                  className={`flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border p-3 text-left transition-colors ${
                    o.empreendimentoId === origemId
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {o.empreendimentoNome}
                    </span>
                    {o.reservado > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {o.saldo} {insumo.unidade} em estoque, {o.reservado} já reservado para
                        etiquetas pendentes
                      </span>
                    )}
                  </span>
                  <Tag color={o.disponivel >= sugestaoQtd ? "green" : "amber"}>
                    {o.disponivel} {insumo.unidade} disponível
                  </Tag>
                </button>
              ) : (
                <OrigemBloqueada key={o.empreendimentoId} origem={o} unidade={insumo.unidade} />
              ),
            )}
          </div>
        )}
      </fieldset>

      <div className="max-w-[12rem]">
        <label htmlFor="qtd-transferir" className={labelCls}>
          Quantidade ({insumo.unidade})
        </label>
        <input
          id="qtd-transferir"
          type="number"
          min={0.001}
          step="any"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          className={inputCls}
        />
        {origemSelecionada && Number(quantidade) > origemSelecionada.disponivel && (
          <p className="mt-1 text-xs text-destructive">
            Acima do disponível na origem ({origemSelecionada.disponivel} {insumo.unidade}).
          </p>
        )}
      </div>

      <div>
        <label htmlFor="motivo" className={labelCls}>
          Motivo <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="motivo"
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="ex.: urgência na produção do lote"
          className={inputCls}
        />
      </div>

      <Button
        type="submit"
        disabled={pendente || !origemId || Number(quantidade) <= 0}
        className="w-full"
      >
        <ArrowRightLeft className="size-4" aria-hidden />
        {pendente ? "Transferindo…" : "Transferir e registrar pendência"}
      </Button>
    </form>
  );
}

const STATUS_LOTE_LABEL: Record<string, string> = {
  aberto: "lote aberto",
  finalizado: "lote finalizado",
};

// SPE com saldo mas sem disponível: explica quem segura a reserva (etiquetas
// pendentes por lote/kit) e o que fazer para liberar — em vez de só sumir ou
// mostrar um "0 disponível" sem contexto.
function OrigemBloqueada({
  origem,
  unidade,
}: {
  origem: OrigemTransferencia;
  unidade: string;
}) {
  const reservaTotal = origem.reservado >= origem.saldo;
  const temLoteAberto = origem.reservas.some((r) => r.statusLote === "aberto");
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-foreground">{origem.empreendimentoNome}</span>
        <Tag color="slate">sem disponível</Tag>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Tem{" "}
        <span className="font-medium text-foreground">
          {origem.saldo} {unidade}
        </span>{" "}
        em estoque, mas {reservaTotal ? "todo o saldo" : `${origem.reservado} ${unidade}`} já está
        comprometido com etiquetas impressas que ainda não foram bipadas:
      </p>
      {origem.reservas.length > 0 && (
        <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-muted-foreground">
          {origem.reservas.map((r, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden>•</span>
              <span>
                {r.qtdPendentes} etiqueta{r.qtdPendentes === 1 ? "" : "s"} de{" "}
                <span className="font-medium text-foreground">{r.tipoKitNome}</span> (
                {STATUS_LOTE_LABEL[r.statusLote] ?? r.statusLote}) — segura {r.consumo} {unidade}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Para liberar: bipe essas etiquetas na entrada
        {temLoteAberto ? " ou cancele o lote aberto" : ""}. Sem isso, transferir furaria a
        produção já prometida desta SPE.
      </p>
    </div>
  );
}
