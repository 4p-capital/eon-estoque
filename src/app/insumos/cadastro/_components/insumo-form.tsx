"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { criarInsumo, editarInsumo, type FormState } from "@/app/insumos/actions";
import { inputCls, labelCls } from "@/app/_components/form-styles";
import { SubmitButton } from "@/app/_components/submit-button";
import { NcmPicker } from "@/app/insumos/cadastro/_components/ncm-picker";

const INITIAL: FormState = { status: "idle" };

export type InsumoInicial = {
  id: string;
  nome: string;
  unidade: string;
  estoqueMin: number;
  leadTime: number;
  consumoDia: number;
  ncm: string | null;
};

// Form de insumo compartilhado por criar e editar (mesmos campos/API).
export function InsumoForm({
  inicial,
  onSuccess,
}: {
  inicial?: InsumoInicial;
  onSuccess: () => void;
}) {
  const editando = Boolean(inicial);
  const [state, formAction] = useActionState(editando ? editarInsumo : criarInsumo, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok") {
      toast.success(state.message ?? "Salvo.");
      if (!editando) formRef.current?.reset();
      onSuccess();
    } else if (state.status === "error") {
      toast.error(state.message ?? "Erro ao salvar.");
    }
  }, [state, onSuccess, editando]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 p-4">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <div>
        <label htmlFor="nome" className={labelCls}>
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          className={inputCls}
          defaultValue={inicial?.nome}
          placeholder="Fio flexível 2,5mm"
        />
      </div>
      <div>
        <span className={labelCls}>NCM (classificação fiscal)</span>
        <NcmPicker defaultCodigo={inicial?.ncm} />
        <p className="mt-1 text-xs text-muted-foreground">
          Opcional. Capturado automaticamente na entrada por nota; defina aqui para classificar manualmente.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="unidade" className={labelCls}>
            Unidade
          </label>
          <input
            id="unidade"
            name="unidade"
            required
            className={inputCls}
            defaultValue={inicial?.unidade}
            placeholder="m"
          />
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
            defaultValue={inicial?.estoqueMin ?? 0}
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
            defaultValue={inicial?.leadTime ?? 0}
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
            defaultValue={inicial?.consumoDia ?? 0}
            className={inputCls}
          />
        </div>
      </div>
      {editando && (
        <p className="text-xs text-muted-foreground">
          Mudar a unidade não converte o saldo já lançado — ajuste com o saldo zerado.
        </p>
      )}
      <SubmitButton className="w-full">
        {editando ? "Salvar alterações" : "Cadastrar insumo"}
      </SubmitButton>
    </form>
  );
}
