"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [nomeAtual, setNomeAtual] = useState(nome ?? "");
  const [valor, setValor] = useState(nome ?? "");
  const [editando, setEditando] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!empreendimentoId) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  function salvar() {
    if (!empreendimentoId) return;
    const novo = valor.trim();
    if (!novo || novo === nomeAtual) {
      setValor(nomeAtual);
      setEditando(false);
      return;
    }
    startTransition(async () => {
      const res = await renomearObra(empreendimentoId, novo);
      if (res.status === "error") {
        toast.error(res.message ?? "Não foi possível renomear.");
        setValor(nomeAtual);
      } else {
        toast.success("Nome da obra atualizado.");
        setNomeAtual(novo);
        router.refresh();
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
            setValor(nomeAtual);
            setEditando(false);
          }
        }}
        placeholder="ex.: Gran Veneza"
        aria-label="Nome da obra"
        className={`${inputCls} h-8 max-w-xs py-1`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValor(nomeAtual);
        setEditando(true);
      }}
      className="-mx-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      title="Editar nome da obra"
    >
      <span className={nomeAtual ? "" : "text-muted-foreground"}>{nomeAtual || "Definir nome"}</span>
      <Pencil className="size-3.5 text-primary" aria-hidden />
    </button>
  );
}
