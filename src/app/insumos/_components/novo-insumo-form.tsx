"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { inputCls, labelCls } from "@/app/_components/form-styles";
import { criarInsumo, type FormState } from "@/app/insumos/actions";

const INITIAL: FormState = { status: "idle" };

export function NovoInsumoForm() {
  const [state, formAction] = useActionState(criarInsumo, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok") {
      toast.success(state.message ?? "Salvo.");
      formRef.current?.reset();
    } else if (state.status === "error") {
      toast.error(state.message ?? "Erro ao salvar.");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
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
      </div>

      <div className="grid grid-cols-2 gap-3">
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
