"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { convidarMembro, type ConvidarState } from "@/app/equipe/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL: ConvidarState = { status: "idle" };

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ConvidarForm({ galpao }: { galpao: boolean }) {
  const [state, formAction] = useActionState(convidarMembro, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (state.status === "ok") {
      toast.success(state.message ?? "Membro convidado.");
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required placeholder="João Souza" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required placeholder="joao@cliente.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="papel">Papel</Label>
          <select
            id="papel"
            name="papel"
            defaultValue={galpao ? "galpao_operador" : "tenant_gestor"}
            className={selectCls}
          >
            {galpao ? (
              <>
                <option value="galpao_operador">Operador</option>
                <option value="galpao_admin">Administrador</option>
              </>
            ) : (
              <>
                <option value="tenant_gestor">Gestor</option>
                <option value="tenant_admin">Administrador</option>
              </>
            )}
          </select>
        </div>
      </div>

      <SubmitButton>Convidar membro</SubmitButton>

      {state.status === "ok" && state.linkFallback && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Link de primeiro acesso (caso o e-mail de convite não chegue, repasse ao membro):
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
