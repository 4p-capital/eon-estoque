"use client";

import { useRef, useState } from "react";

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
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="rounded-md border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
      >
        Recusar entrega
      </button>

      <dialog
        ref={ref}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-bege-claro bg-white p-0 shadow-xl backdrop:bg-preto/40"
      >
        <div className="p-5">
          <h2 className="text-base font-semibold text-preto">Recusar a entrega inteira</h2>
          <p className="mt-2 text-sm text-cinza/80">
            O material volta ao fornecedor e nada entra no estoque. O motivo fica registrado no
            relatório de eventos.
          </p>
          <label htmlFor="motivo-recusa" className="mt-4 block text-sm font-medium text-cinza">
            Motivo
          </label>
          <textarea
            id="motivo-recusa"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-bege-claro bg-white px-3 py-2 text-sm text-preto focus-visible:border-bege focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bege"
            placeholder="Ex.: quantidade muito divergente, material avariado…"
          />

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium text-cinza hover:bg-bege-claro"
              onClick={() => ref.current?.close()}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy || motivo.trim().length < 3}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              onClick={() => {
                onConfirm(motivo.trim());
                ref.current?.close();
              }}
            >
              Recusar entrega
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
