"use client";

import { useActionState, useEffect } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { reenviarConviteCliente, type ProvisionarState } from "@/app/clientes/actions";

const INITIAL: ProvisionarState = { status: "idle" };

export function ReenviarConviteBotao({ email }: { email: string }) {
  const [state, formAction] = useActionState(reenviarConviteCliente, INITIAL);

  useEffect(() => {
    if (state.status === "ok") {
      const link = state.linkFallback;
      toast.success(
        state.message ?? "Convite reenviado.",
        link
          ? { action: { label: "Copiar link", onClick: () => navigator.clipboard.writeText(link) } }
          : undefined,
      );
    }
    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="email" value={email} />
      <SubmitButton size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
        <Send className="size-3.5" /> Reenviar
      </SubmitButton>
    </form>
  );
}
