"use client";

import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  children: ReactNode; // conteúdo do botão que abre o diálogo (ícone/label)
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  triggerAriaLabel: string;
  triggerClassName?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
};

// Confirmação acessível via <dialog> nativo: Esc fecha, foco fica preso,
// backdrop clicável. Substitui window.confirm() (proibido pelo AGENTS).
export function ConfirmDialog({
  children,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  triggerAriaLabel,
  triggerClassName,
  destructive = false,
  busy = false,
  onConfirm,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label={triggerAriaLabel}
        className={triggerClassName}
        onClick={() => ref.current?.showModal()}
      >
        {children}
      </button>

      <dialog
        ref={ref}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-bege-claro bg-white p-0 shadow-xl backdrop:bg-preto/40"
      >
        <div className="p-5">
          <h2 className="text-base font-semibold text-preto">{title}</h2>
          {description && <p className="mt-2 text-sm text-cinza/80">{description}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium text-cinza hover:bg-bege-claro"
              onClick={() => ref.current?.close()}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60",
                destructive ? "bg-red-600 hover:bg-red-700" : "bg-preto hover:bg-cinza",
              )}
              onClick={() => {
                onConfirm();
                ref.current?.close();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
