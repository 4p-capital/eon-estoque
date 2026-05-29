"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { inputCls, labelCls } from "@/app/_components/form-styles";
import { criarKit, editarKit } from "@/app/tipos-kit/actions";
import { InsumoPicker, type InsumoOption, type LinhaInsumo } from "./insumo-picker";

type Linha = LinhaInsumo & { key: string; quantidade: string };

export type KitInicial = {
  id: string;
  nome: string;
  descricao: string;
  itens: { insumoId: string; nome: string; unidade: string; quantidade: number }[];
};

function novaLinha(): Linha {
  return { key: crypto.randomUUID(), insumoId: null, nome: "", unidade: "", isNew: false, quantidade: "" };
}

function linhasIniciais(inicial?: KitInicial): Linha[] {
  if (!inicial || inicial.itens.length === 0) return [novaLinha()];
  return inicial.itens.map((i) => ({
    key: crypto.randomUUID(),
    insumoId: i.insumoId,
    nome: i.nome,
    unidade: i.unidade,
    isNew: false,
    quantidade: String(i.quantidade),
  }));
}

export function KitForm({ insumos, inicial }: { insumos: InsumoOption[]; inicial?: KitInicial }) {
  const editando = Boolean(inicial);
  const router = useRouter();
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [linhas, setLinhas] = useState<Linha[]>(() => linhasIniciais(inicial));
  const [pending, startTransition] = useTransition();

  function patchLinha(key: string, patch: Partial<Linha>) {
    setLinhas((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const itens = linhas
      .filter((l) => l.nome.trim() && l.quantidade)
      .map((l) => ({
        insumo_id: l.isNew ? null : l.insumoId,
        nome: l.nome.trim(),
        unidade: l.unidade.trim(),
        quantidade: Number(l.quantidade),
      }));

    if (!nome.trim()) return toast.error("Informe o nome do kit.");
    if (itens.length === 0) return toast.error("Adicione ao menos um insumo ao kit.");

    startTransition(async () => {
      const res = inicial
        ? await editarKit({ kitId: inicial.id, nome, descricao, itens })
        : await criarKit({ nome, descricao, itens });

      if (res.status === "ok") {
        toast.success(res.message ?? "Salvo.");
        if (editando) {
          router.push("/tipos-kit");
        } else {
          setNome("");
          setDescricao("");
          setLinhas([novaLinha()]);
        }
      } else {
        toast.error(res.message ?? "Erro ao salvar o kit.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
        <div>
          <label htmlFor="kit-nome" className={labelCls}>
            Nome do kit
          </label>
          <input
            id="kit-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputCls}
            placeholder="Kit elétrico — apartamento padrão"
          />
        </div>
        <div>
          <label htmlFor="kit-desc" className={labelCls}>
            Descrição <span className="text-cinza/40">(opcional)</span>
          </label>
          <input
            id="kit-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <span className={labelCls}>Composição (BOM)</span>
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-[1fr_5rem_6rem_2.5rem] gap-2 px-1 text-xs uppercase text-cinza/50">
            <span>Insumo</span>
            <span>Unidade</span>
            <span>Qtd/kit</span>
            <span className="sr-only">Remover</span>
          </div>

          {linhas.map((l) => (
            <div key={l.key} className="grid grid-cols-[1fr_5rem_6rem_2.5rem] items-start gap-2">
              <InsumoPicker insumos={insumos} value={l} onChange={(v) => patchLinha(l.key, v)} />
              <input
                value={l.unidade}
                onChange={(e) => patchLinha(l.key, { unidade: e.target.value })}
                readOnly={!l.isNew}
                placeholder="un"
                aria-label="Unidade"
                className={cn(inputCls, !l.isNew && "bg-bege-claro/30 text-cinza/70")}
              />
              <input
                type="number"
                min={0}
                step="0.001"
                value={l.quantidade}
                onChange={(e) => patchLinha(l.key, { quantidade: e.target.value })}
                placeholder="0"
                aria-label="Quantidade por kit"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() =>
                  setLinhas((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))
                }
                aria-label="Remover insumo"
                className="mt-1 flex h-10 items-center justify-center rounded-md text-cinza/50 transition-colors hover:bg-bege-claro hover:text-red-600"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLinhas((ls) => [...ls, novaLinha()])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cinza transition-colors hover:text-preto"
        >
          <Plus className="size-4" aria-hidden />
          Adicionar insumo
        </button>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-preto px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cinza focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-preto disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {editando ? "Salvar alterações" : "Cadastrar kit"}
      </button>
    </form>
  );
}
