"use client";

import { useRef, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
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
        className={cn(
          "m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border bg-popover p-0 text-popover-foreground shadow-xl backdrop:bg-foreground/40",
          destructive ? "border-destructive/40" : "border-border",
        )}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            {destructive && (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" aria-hidden />
              </span>
            )}
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
              {description && (
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              disabled={busy}
              onClick={() => {
                onConfirm();
                ref.current?.close();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
