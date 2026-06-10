"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
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
  type OrigemDisponivel,
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
  const [origens, setOrigens] = useState<OrigemDisponivel[] | null>(null);
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
      <div>
        <label htmlFor="origem" className={labelCls}>
          SPE de origem
        </label>
        {origens === null ? (
          <p className="text-sm text-muted-foreground">Buscando estoque das outras SPEs…</p>
        ) : origens.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Nenhuma outra SPE tem este insumo disponível. Registre uma entrada de NF ou ajuste de
            inventário.
          </p>
        ) : (
          <select
            id="origem"
            value={origemId}
            onChange={(e) => setOrigemId(e.target.value)}
            className={inputCls}
          >
            <option value="">Selecione…</option>
            {origens.map((o) => (
              <option key={o.empreendimentoId} value={o.empreendimentoId}>
                {o.empreendimentoNome} — disponível: {o.disponivel} {insumo.unidade}
              </option>
            ))}
          </select>
        )}
      </div>

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
