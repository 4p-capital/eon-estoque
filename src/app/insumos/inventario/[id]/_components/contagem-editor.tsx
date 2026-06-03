"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { aplicarContagem, salvarItens } from "@/app/insumos/inventario/actions";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { inputCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import type { InsumoOpcao } from "@/lib/insumos";

type ItemInicial = {
  insumoId: string;
  nome: string;
  unidade: string;
  qtdContada: number;
  saldoSnapshot: number | null;
};

type Linha = {
  insumoId: string;
  nome: string;
  unidade: string;
  qtdContada: string;
  saldoSistema: number;
};

const nf = new Intl.NumberFormat("pt-BR");

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function ContagemEditor({
  contagemId,
  status,
  itensIniciais,
  saldos,
  insumos,
}: {
  contagemId: string;
  status: string;
  itensIniciais: ItemInicial[];
  saldos: Record<string, number>;
  insumos: InsumoOpcao[];
}) {
  const readOnly = status !== "aberta";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    itensIniciais.map((i) => ({
      insumoId: i.insumoId,
      nome: i.nome,
      unidade: i.unidade,
      qtdContada: String(i.qtdContada),
      saldoSistema: saldos[i.insumoId] ?? 0,
    })),
  );

  const jaAdicionados = useMemo(() => new Set(linhas.map((l) => l.insumoId)), [linhas]);
  const sugestoes = useMemo(() => {
    const t = normalizar(busca.trim());
    if (!t) return [];
    return insumos
      .filter((i) => !jaAdicionados.has(i.id) && normalizar(i.nome).includes(t))
      .slice(0, 8);
  }, [busca, insumos, jaAdicionados]);

  function adicionar(insumo: InsumoOpcao) {
    setLinhas((ls) => [
      ...ls,
      {
        insumoId: insumo.id,
        nome: insumo.nome,
        unidade: insumo.unidade,
        qtdContada: "",
        saldoSistema: saldos[insumo.id] ?? 0,
      },
    ]);
    setBusca("");
  }

  function patch(insumoId: string, qtdContada: string) {
    setLinhas((ls) => ls.map((l) => (l.insumoId === insumoId ? { ...l, qtdContada } : l)));
  }

  function remover(insumoId: string) {
    setLinhas((ls) => ls.filter((l) => l.insumoId !== insumoId));
  }

  function itensPayload() {
    return linhas
      .filter((l) => l.qtdContada !== "")
      .map((l) => ({ insumo_id: l.insumoId, qtd_contada: Number(l.qtdContada) }));
  }

  function salvar() {
    startTransition(async () => {
      const res = await salvarItens(contagemId, itensPayload());
      if (res.status === "ok") {
        toast.success(res.message ?? "Contagem salva.");
      } else {
        toast.error(res.message ?? "Erro ao salvar.");
      }
      router.refresh();
    });
  }

  function aplicar() {
    startTransition(async () => {
      const salvo = await salvarItens(contagemId, itensPayload());
      if (salvo.status !== "ok") {
        toast.error(salvo.message ?? "Erro ao salvar antes de aplicar.");
        return;
      }
      const res = await aplicarContagem(contagemId);
      if (res.status === "ok") {
        toast.success(res.message ?? "Contagem aplicada.");
        router.push("/insumos/inventario");
        router.refresh();
      } else {
        toast.error(res.message ?? "Erro ao aplicar.");
      }
    });
  }

  if (readOnly) {
    return <ContagemReadOnly itens={itensIniciais} aplicada={status === "aplicada"} />;
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar insumo para adicionar…"
          aria-label="Buscar insumo"
          className={`${inputCls} pl-9`}
        />
        {sugestoes.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg">
            {sugestoes.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => adicionar(s)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="truncate text-foreground">{s.nome}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{s.unidade}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {linhas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Busque e adicione os insumos contados. O sistema mostra o saldo atual e a diferença.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card shadow-sm">
          <div className="grid grid-cols-[1fr_5.5rem_6rem_6rem_2.5rem] gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Insumo</span>
            <span className="text-right">Sistema</span>
            <span className="text-right">Contado</span>
            <span className="text-right">Diferença</span>
            <span className="sr-only">Remover</span>
          </div>
          {linhas.map((l) => {
            const dif = l.qtdContada === "" ? null : Number(l.qtdContada) - l.saldoSistema;
            return (
              <div
                key={l.insumoId}
                className="grid grid-cols-[1fr_5.5rem_6rem_6rem_2.5rem] items-center gap-2 border-t border-border px-4 py-2 first:border-t-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{l.nome}</p>
                  <p className="text-xs text-muted-foreground">{l.unidade}</p>
                </div>
                <span className="text-right text-sm tabular-nums text-muted-foreground">
                  {nf.format(l.saldoSistema)}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={l.qtdContada}
                  onChange={(e) => patch(l.insumoId, e.target.value)}
                  aria-label={`Quantidade contada de ${l.nome}`}
                  className={`${inputCls} mt-0 py-1.5 text-right`}
                  placeholder="0"
                />
                <span className="text-right text-sm tabular-nums">
                  {dif === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : dif === 0 ? (
                    <Tag color="green">OK</Tag>
                  ) : (
                    <Tag color="amber">
                      {dif > 0 ? "+" : ""}
                      {nf.format(dif)}
                    </Tag>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remover(l.insumoId)}
                  aria-label={`Remover ${l.nome}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={salvar} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Salvar rascunho
        </Button>
        <ConfirmDialog
          title="Aplicar contagem?"
          description="Isso lança ajustes no estoque para que o saldo de cada insumo fique igual ao contado. Não dá para desfazer."
          confirmLabel="Aplicar"
          triggerAriaLabel="Aplicar contagem"
          busy={pending}
          onConfirm={aplicar}
          triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
          Aplicar contagem
        </ConfirmDialog>
      </div>
    </div>
  );
}

function ContagemReadOnly({ itens, aplicada }: { itens: ItemInicial[]; aplicada: boolean }) {
  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          aplicada
            ? "border-success/30 bg-success/10 text-foreground"
            : "border-border bg-muted/40 text-muted-foreground"
        }`}
      >
        {aplicada
          ? "Contagem aplicada — os ajustes já foram lançados no estoque."
          : "Contagem cancelada."}
      </div>
      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <div className="grid grid-cols-[1fr_6rem_6rem_6rem] gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Insumo</span>
          <span className="text-right">Sistema</span>
          <span className="text-right">Contado</span>
          <span className="text-right">Diferença</span>
        </div>
        {itens.map((i) => {
          const base = i.saldoSnapshot ?? 0;
          const dif = i.qtdContada - base;
          return (
            <div
              key={i.insumoId}
              className="grid grid-cols-[1fr_6rem_6rem_6rem] items-center gap-2 border-t border-border px-4 py-2 first:border-t-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{i.nome}</p>
                <p className="text-xs text-muted-foreground">{i.unidade}</p>
              </div>
              <span className="text-right text-sm tabular-nums text-muted-foreground">{nf.format(base)}</span>
              <span className="text-right text-sm tabular-nums text-foreground">{nf.format(i.qtdContada)}</span>
              <span className="text-right text-sm tabular-nums">
                {dif === 0 ? (
                  <span className="text-muted-foreground">0</span>
                ) : (
                  <span className="font-semibold text-foreground">
                    {dif > 0 ? "+" : ""}
                    {nf.format(dif)}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {itens.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sem itens nesta contagem.</p>
        )}
      </div>
    </div>
  );
}
