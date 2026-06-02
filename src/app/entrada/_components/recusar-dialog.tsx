"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type RecusarDialogProps = {
  busy?: boolean;
  onConfirm: (motivo: string) => void;
};

// Recusa da entrega inteira — exige motivo (vai pro evento/relatório).
export function RecusarDialog({ busy = false, onConfirm }: RecusarDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [motivo, setMotivo] = useState("");

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => ref.current?.showModal()}
      >
        Recusar entrega
      </Button>

      <dialog
        ref={ref}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-xl backdrop:bg-foreground/40"
      >
        <div className="p-5">
          <h2 className="text-base font-semibold text-foreground">Recusar a entrega inteira</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O material volta ao fornecedor e nada entra no estoque. O motivo fica registrado no
            relatório de eventos.
          </p>
          <label htmlFor="motivo-recusa" className="mt-4 block text-sm font-medium text-foreground">
            Motivo
          </label>
          <textarea
            id="motivo-recusa"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Ex.: quantidade muito divergente, material avariado…"
          />

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => ref.current?.close()}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || motivo.trim().length < 3}
              onClick={() => {
                onConfirm(motivo.trim());
                ref.current?.close();
              }}
            >
              Recusar entrega
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
