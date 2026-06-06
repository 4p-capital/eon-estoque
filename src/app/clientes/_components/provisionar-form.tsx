"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { provisionarTenant, type ProvisionarState } from "@/app/clientes/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL: ProvisionarState = { status: "idle" };

export function ProvisionarForm() {
  const [state, formAction] = useActionState(provisionarTenant, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (state.status === "ok") {
      toast.success(state.message ?? "Cliente cadastrado.");
      formRef.current?.reset();
    }
    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  async function copiarLink() {
    if (!state.linkFallback) return;
    await navigator.clipboard.writeText(state.linkFallback);
    setCopiado(true);
    toast.success("Link copiado.");
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome do cliente</Label>
          <Input id="nome" name="nome" required placeholder="Construtora Exemplo" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (opcional)</Label>
          <Input id="slug" name="slug" placeholder="construtora-exemplo" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminNome">Nome do admin</Label>
          <Input id="adminNome" name="adminNome" required placeholder="Maria Silva" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminEmail">E-mail do admin</Label>
          <Input id="adminEmail" name="adminEmail" type="email" required placeholder="maria@cliente.com" />
        </div>
      </div>

      <SubmitButton>Convidar cliente</SubmitButton>

      {state.status === "ok" && state.linkFallback && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Link de primeiro acesso (caso o e-mail de convite não chegue, repasse ao cliente):
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1.5 text-[11px]">
              {state.linkFallback}
            </code>
            <button
              type="button"
              onClick={copiarLink}
              aria-label="Copiar link"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
