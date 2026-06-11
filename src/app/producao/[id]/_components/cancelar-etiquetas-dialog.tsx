"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TicketX } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { cancelarEtiquetas } from "@/app/producao/actions";

type Props = {
  loteId: string;
  pendentes: number; // máximo cancelável
};

// Cancela etiquetas que sobraram (erro de impressão / produção menor que o
// impresso), liberando a reserva de BOM. Só o gerente vê este botão — e o
// banco valida o papel de novo na RPC. Motivo é obrigatório: o cancelamento
// fica assinado (quem/quando/porquê) na trilha da unidade.
export function CancelarEtiquetasDialog({ loteId, pendentes }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [quantidade, setQuantidade] = useState(String(pendentes));
  const [motivo, setMotivo] = useState("");
  const [ocupado, startTransition] = useTransition();

  const qtd = Number(quantidade);
  const qtdValida = Number.isInteger(qtd) && qtd > 0 && qtd <= pendentes;

  function abrir() {
    setQuantidade(String(pendentes));
    setMotivo("");
    ref.current?.showModal();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await cancelarEtiquetas({ loteId, quantidade, motivo });
      if (res.status === "error") {
        toast.error(res.message ?? "Não foi possível cancelar as etiquetas.");
        return;
      }
      toast.success(
        `${qtd} etiqueta${qtd === 1 ? "" : "s"} cancelada${qtd === 1 ? "" : "s"} — a reserva de insumo foi liberada.`,
      );
      ref.current?.close();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cancelar etiquetas não bipadas"
        onClick={abrir}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <TicketX className="size-4" aria-hidden />
        Cancelar etiquetas não bipadas
      </button>

      <dialog
        ref={ref}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-xl backdrop:bg-foreground/40"
      >
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Cancelar etiquetas não bipadas
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Para sobra ou erro de impressão: a etiqueta vira{" "}
              <span className="font-medium text-foreground">cancelada</span> (o QR deixa de valer
              no bipe) e a reserva de insumo é liberada na hora. O cancelamento fica registrado em
              seu nome. Se os kits ainda vão ser produzidos, não cancele — bipe quando ficarem
              prontos.
            </p>
          </div>

          <div className="max-w-[10rem]">
            <label htmlFor="qtd-cancelar" className={labelCls}>
              Quantidade (máx. {pendentes})
            </label>
            <input
              id="qtd-cancelar"
              type="number"
              min={1}
              max={pendentes}
              step={1}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="motivo-cancelar" className={labelCls}>
              Motivo <span className="text-destructive">(obrigatório)</span>
            </label>
            <input
              id="motivo-cancelar"
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="ex.: impressora travou e reimprimimos a tira"
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>
              Voltar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={ocupado || !qtdValida || motivo.trim().length === 0}
            >
              {ocupado ? "Cancelando…" : "Cancelar etiquetas"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
