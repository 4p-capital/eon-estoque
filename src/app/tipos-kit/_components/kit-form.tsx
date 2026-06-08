"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { criarKit, editarKit } from "@/app/tipos-kit/actions";
import { InsumoPicker, type InsumoOption, type LinhaInsumo } from "./insumo-picker";

type Linha = LinhaInsumo & { key: string; quantidade: string; estoqueMin: string };

export type KitInicial = {
  id: string;
  nome: string;
  descricao: string;
  itens: { insumoId: string; nome: string; unidade: string; quantidade: number; estoqueMin: number }[];
};

function novaLinha(): Linha {
  return {
    key: crypto.randomUUID(),
    insumoId: null,
    nome: "",
    unidade: "",
    isNew: false,
    quantidade: "",
    estoqueMin: "",
  };
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
    estoqueMin: i.estoqueMin ? String(i.estoqueMin) : "",
  }));
}

export function KitForm({
  insumos,
  inicial,
  onSuccess,
}: {
  insumos: InsumoOption[];
  inicial?: KitInicial;
  // Chamado após criar com sucesso (ex.: fechar o drawer e atualizar a lista).
  onSuccess?: () => void;
}) {
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
        estoque_min: l.estoqueMin.trim() === "" ? null : Number(l.estoqueMin),
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
          onSuccess?.();
          router.refresh();
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
            Descrição <span className="text-muted-foreground">(opcional)</span>
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
          <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem_4.5rem_2.5rem] gap-2 px-1 text-xs uppercase text-muted-foreground">
            <span>Insumo</span>
            <span>Un.</span>
            <span>Qtd/kit</span>
            <span>Mín.</span>
            <span className="sr-only">Remover</span>
          </div>

          {linhas.map((l) => (
            <div
              key={l.key}
              className="grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem_4.5rem_2.5rem] items-start gap-2"
            >
              <InsumoPicker insumos={insumos} value={l} onChange={(v) => patchLinha(l.key, v)} />
              <input
                value={l.unidade}
                onChange={(e) => patchLinha(l.key, { unidade: e.target.value })}
                readOnly={!l.isNew}
                placeholder="un"
                aria-label="Unidade"
                className={cn(inputCls, !l.isNew && "bg-muted text-muted-foreground")}
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
              <input
                type="number"
                min={0}
                step="0.001"
                value={l.estoqueMin}
                onChange={(e) => patchLinha(l.key, { estoqueMin: e.target.value })}
                placeholder="—"
                aria-label="Estoque mínimo do insumo"
                title="Estoque mínimo do insumo (acende o alerta de reposição)"
                className={inputCls}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setLinhas((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))
                }
                aria-label="Remover insumo"
                className="mt-1 h-10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setLinhas((ls) => [...ls, novaLinha()])}
          className="mt-3"
        >
          <Plus className="size-4" aria-hidden />
          Adicionar insumo
        </Button>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {editando ? "Salvar alterações" : "Cadastrar kit"}
      </Button>
    </form>
  );
}
