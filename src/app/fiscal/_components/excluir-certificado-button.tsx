"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { excluirSpe } from "@/app/fiscal/actions";

export function ExcluirCertificadoButton({
  id,
  razaoSocial,
}: {
  id: string;
  razaoSocial: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <ConfirmDialog
      title="Remover certificado"
      description={`Apaga o certificado e a senha de ${razaoSocial}. Novas sincronizações dessa SPE param até recadastrar.`}
      confirmLabel="Remover"
      destructive
      busy={pending}
      triggerAriaLabel={`Remover certificado de ${razaoSocial}`}
      triggerClassName="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      onConfirm={() =>
        startTransition(async () => {
          const res = await excluirSpe(id);
          if (res.status === "ok") {
            toast.success(res.message ?? "Removido.");
          } else {
            toast.error(res.message ?? "Erro ao remover.");
          }
        })
      }
    >
      <Trash2 className="size-4" aria-hidden />
    </ConfirmDialog>
  );
}
