"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { inputCls, labelCls } from "@/app/_components/form-styles";
import { cadastrarSpe, type FormState } from "@/app/fiscal/actions";
import { UFS } from "@/lib/fiscal/uf";

const INITIAL: FormState = { status: "idle" };

type EmpreendimentoOption = { id: string; nome: string };

export function NovoCertificadoForm({
  empreendimentos,
  onSuccess,
}: {
  empreendimentos: EmpreendimentoOption[];
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(cadastrarSpe, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok") {
      toast.success(state.message ?? "Certificado cadastrado.");
      formRef.current?.reset();
      onSuccess?.();
    } else if (state.status === "error") {
      toast.error(state.message ?? "Erro ao cadastrar.");
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label htmlFor="certificado" className={labelCls}>
          Certificado A1 (.pfx)
        </label>
        <input
          id="certificado"
          name="certificado"
          type="file"
          accept=".pfx,.p12"
          required
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          CNPJ, razão social e validade são lidos do próprio certificado — você não digita nada.
        </p>
      </div>

      <div>
        <label htmlFor="senha" className={labelCls}>
          Senha do certificado
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          autoComplete="off"
          className={inputCls}
          placeholder="••••••••"
        />
      </div>

      <div>
        <label htmlFor="uf" className={labelCls}>
          UF da SPE
        </label>
        <select id="uf" name="uf" required className={inputCls} defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {UFS.map((uf) => (
            <option key={uf.codigo} value={uf.codigo}>
              {uf.sigla} — {uf.nome}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Estado da SPE — a SEFAZ exige isso na consulta (cUFAutor).
        </p>
      </div>

      <div>
        <label htmlFor="empreendimento_id" className={labelCls}>
          Empreendimento <span className="text-muted-foreground">(opcional)</span>
        </label>
        <select id="empreendimento_id" name="empreendimento_id" className={inputCls} defaultValue="">
          <option value="">— sem vínculo —</option>
          {empreendimentos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton className="w-full">Cadastrar certificado</SubmitButton>
    </form>
  );
}
