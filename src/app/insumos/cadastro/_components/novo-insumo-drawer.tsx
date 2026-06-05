"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { criarInsumo, type FormState } from "@/app/insumos/actions";
import { inputCls, labelCls } from "@/app/_components/form-styles";
import { SubmitButton } from "@/app/_components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const INITIAL: FormState = { status: "idle" };

// Botão "Cadastrar insumo" que abre o formulário num drawer (Sheet). Avisa o pai
// via onCreated para recarregar a lista do catálogo.
export function NovoInsumoDrawer({ onCreated }: { onCreated: () => void }) {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button type="button">
          <Plus className="size-4" aria-hidden />
          Cadastrar insumo
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(32rem,100vw)] gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading">Novo insumo</SheetTitle>
          <SheetDescription>
            Cadastre o item do catálogo. O saldo aparece em Estoque após a entrada.
          </SheetDescription>
        </SheetHeader>
        <InsumoForm
          onSuccess={() => {
            onCreated();
            setAberto(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function InsumoForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction] = useActionState(criarInsumo, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok") {
      toast.success(state.message ?? "Insumo cadastrado.");
      formRef.current?.reset();
      onSuccess();
    } else if (state.status === "error") {
      toast.error(state.message ?? "Erro ao salvar.");
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 p-4">
          <div>
            <label htmlFor="nome" className={labelCls}>
              Nome
            </label>
            <input id="nome" name="nome" required className={inputCls} placeholder="Fio flexível 2,5mm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="unidade" className={labelCls}>
                Unidade
              </label>
              <input id="unidade" name="unidade" required className={inputCls} placeholder="m" />
            </div>
            <div>
              <label htmlFor="estoque_min" className={labelCls}>
                Estoque mínimo
              </label>
              <input
                id="estoque_min"
                name="estoque_min"
                type="number"
                min={0}
                step="0.001"
                defaultValue={0}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="lead_time_dias" className={labelCls}>
                Lead time (dias)
              </label>
              <input
                id="lead_time_dias"
                name="lead_time_dias"
                type="number"
                min={0}
                step="1"
                defaultValue={0}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="consumo_dia" className={labelCls}>
                Consumo/dia
              </label>
              <input
                id="consumo_dia"
                name="consumo_dia"
                type="number"
                min={0}
                step="0.001"
                defaultValue={0}
                className={inputCls}
              />
            </div>
          </div>
          <SubmitButton className="w-full">Cadastrar insumo</SubmitButton>
        </form>
  );
}
