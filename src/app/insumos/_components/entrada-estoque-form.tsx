"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { inputCls, labelCls } from "@/app/_components/form-styles";
import { registrarEntrada, type FormState } from "@/app/insumos/actions";

const INITIAL: FormState = { status: "idle" };

type InsumoOption = { id: string; nome: string; unidade: string };

export function EntradaEstoqueForm({ insumos }: { insumos: InsumoOption[] }) {
  const [state, formAction] = useActionState(registrarEntrada, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok") {
      toast.success(state.message ?? "Entrada registrada.");
      formRef.current?.reset();
    } else if (state.status === "error") {
      toast.error(state.message ?? "Erro ao registrar.");
    }
  }, [state]);

  if (insumos.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Cadastre um insumo primeiro para registrar entradas.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label htmlFor="insumo_id" className={labelCls}>
          Insumo
        </label>
        <select id="insumo_id" name="insumo_id" required className={inputCls} defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome} ({i.unidade})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="quantidade" className={labelCls}>
          Quantidade
        </label>
        <input
          id="quantidade"
          name="quantidade"
          type="number"
          min={0}
          step="0.001"
          required
          className={inputCls}
          placeholder="100"
        />
      </div>

      <div>
        <label htmlFor="observacao" className={labelCls}>
          Observação <span className="text-zinc-400">(opcional)</span>
        </label>
        <input
          id="observacao"
          name="observacao"
          className={inputCls}
          placeholder="NF 1234, fornecedor X"
        />
      </div>

      <SubmitButton className="w-full">Registrar entrada</SubmitButton>
    </form>
  );
}
