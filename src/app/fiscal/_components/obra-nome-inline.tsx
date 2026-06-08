"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { inputCls } from "@/app/_components/form-styles";
import { renomearObra } from "@/app/fiscal/actions";

// Nome popular da obra (empreendimento), editável inline na lista de certificados.
export function ObraNomeInline({
  empreendimentoId,
  nome,
}: {
  empreendimentoId: string | null;
  nome: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nome ?? "");
  const [pending, startTransition] = useTransition();

  if (!empreendimentoId) {
    return <span className="text-muted-foreground">—</span>;
  }

  function salvar() {
    if (!empreendimentoId) return;
    const novo = valor.trim();
    if (!novo || novo === (nome ?? "")) {
      setValor(nome ?? "");
      setEditando(false);
      return;
    }
    startTransition(async () => {
      const res = await renomearObra(empreendimentoId, novo);
      if (res.status === "error") {
        toast.error(res.message ?? "Não foi possível renomear.");
        setValor(nome ?? "");
      } else {
        toast.success("Nome da obra atualizado.");
      }
      setEditando(false);
    });
  }

  if (editando) {
    return (
      <input
        autoFocus
        value={valor}
        disabled={pending}
        onChange={(e) => setValor(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            salvar();
          }
          if (e.key === "Escape") {
            setValor(nome ?? "");
            setEditando(false);
          }
        }}
        aria-label="Nome da obra"
        className={`${inputCls} h-8 py-1`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className="group inline-flex items-center gap-1.5 text-left text-foreground transition-colors hover:text-primary"
      title="Clique para renomear a obra"
    >
      <span className={nome ? "" : "text-muted-foreground"}>{nome || "Definir nome"}</span>
      <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
    </button>
  );
}
