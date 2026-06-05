"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { completarOnboarding, type OnboardingState } from "@/app/onboarding/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL: OnboardingState = { status: "idle" };

export function OnboardingForm({ nomeInicial }: { nomeInicial: string }) {
  const [state, formAction] = useActionState(completarOnboarding, INITIAL);

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome de exibição da empresa</Label>
        <Input id="nome" name="nome" required defaultValue={nomeInicial} placeholder="Construtora Exemplo" />
        <p className="text-[11px] text-muted-foreground">
          É como sua empresa aparece na plataforma. CNPJ, razão social e certificado entram depois,
          no cadastro das SPEs.
        </p>
      </div>
      <SubmitButton className="w-full">Concluir cadastro</SubmitButton>
    </form>
  );
}
