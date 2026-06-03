"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Layers, Loader2, Search } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { inputCls } from "@/app/_components/form-styles";
import { formatarCnpj } from "@/lib/fiscal/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SpeCard = {
  empreendimentoId: string;
  razaoSocial: string;
  cnpj: string;
  qtdInsumos: number;
};

type Linha = {
  insumoId: string;
  nome: string;
  unidade: string;
  saldo: number;
  estoqueMin: number | null;
};

const POR_PAGINA = 200;
const GERAL = "geral";
const nf = new Intl.NumberFormat("pt-BR");

export function InsumosBrowser({ spes }: { spes: SpeCard[] }) {
  const [modo, setModo] = useState<string>(GERAL); // GERAL ou um empreendimentoId
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Linha[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const geral = modo === GERAL;
  const speAtiva = spes.find((s) => s.empreendimentoId === modo);

  function selecionar(novoModo: string) {
    setModo(novoModo);
    setPage(0);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setTermo(busca.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  // troca de visão (geral/SPE) feita pelos cards já reseta a página no handler.

  useEffect(() => {
    const supabase = createClient();
    let cancelado = false;
    // Loading da busca: set intencional no início do efeito de fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    const de = page * POR_PAGINA;
    const ate = de + POR_PAGINA - 1;

    (async () => {
      if (geral) {
        let q = supabase
          .from("saldo_insumo")
          .select("insumo_id, nome, unidade, saldo, estoque_min", { count: "exact" })
          .gt("saldo", 0); // Estoque mostra só o que tem saldo; o catálogo completo fica em Cadastro.
        if (termo) q = q.ilike("nome", `%${termo}%`);
        const { data, count, error } = await q
          .order("saldo", { ascending: false })
          .order("nome", { ascending: true })
          .range(de, ate);
        if (cancelado) return;
        if (error) {
          console.error("[insumos] browser geral", error);
          setRows([]);
          setTotal(0);
        } else {
          setRows(
            (data ?? []).map((d) => ({
              insumoId: d.insumo_id ?? "",
              nome: d.nome ?? "",
              unidade: d.unidade ?? "",
              saldo: Number(d.saldo ?? 0),
              estoqueMin: Number(d.estoque_min ?? 0),
            })),
          );
          setTotal(count ?? 0);
        }
        setCarregando(false);
        return;
      }

      let q = supabase
        .from("saldo_insumo_empreendimento")
        .select("insumo_id, nome, unidade, saldo", { count: "exact" })
        .eq("empreendimento_id", modo)
        .gt("saldo", 0);
      if (termo) q = q.ilike("nome", `%${termo}%`);
      const { data, count, error } = await q
        .order("saldo", { ascending: false })
        .order("nome", { ascending: true })
        .range(de, ate);
      if (cancelado) return;
      if (error) {
        console.error("[insumos] browser spe", error);
        setRows([]);
        setTotal(0);
      } else {
        setRows(
          (data ?? []).map((d) => ({
            insumoId: d.insumo_id ?? "",
            nome: d.nome ?? "",
            unidade: d.unidade ?? "",
            saldo: Number(d.saldo ?? 0),
            estoqueMin: null,
          })),
        );
        setTotal(count ?? 0);
      }
      setCarregando(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [modo, geral, termo, page]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const inicio = total === 0 ? 0 : page * POR_PAGINA + 1;
  const fim = Math.min(total, (page + 1) * POR_PAGINA);

  return (
    <div className="space-y-5">
      {/* Cards: estoque geral + um por SPE */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          ativa={geral}
          icone={<Layers className="size-5" aria-hidden />}
          titulo="Estoque geral"
          linha1="Todas as SPEs"
          linha2="Catálogo completo"
          onClick={() => selecionar(GERAL)}
        />
        {spes.map((s) => (
          <Card
            key={s.empreendimentoId}
            ativa={modo === s.empreendimentoId}
            icone={<Building2 className="size-5" aria-hidden />}
            titulo={s.razaoSocial}
            linha1={formatarCnpj(s.cnpj)}
            linha2={`${s.qtdInsumos} insumo${s.qtdInsumos === 1 ? "" : "s"} em estoque`}
            onClick={() => selecionar(s.empreendimentoId)}
          />
        ))}
      </div>

      {/* Cabeçalho da visão + busca */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {geral ? "Estoque geral" : speAtiva?.razaoSocial}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar insumo…"
            aria-label="Buscar insumo"
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {geral
            ? `Nenhum insumo encontrado${termo ? ` para “${termo}”` : ""}.`
            : `Nenhum insumo com saldo nesta SPE${termo ? ` para “${termo}”` : ""}.`}
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <TableRow>
                  <TableHead className="px-3 py-2">Insumo</TableHead>
                  <TableHead className="px-3 py-2 text-right">Saldo</TableHead>
                  {geral && <TableHead className="px-3 py-2 text-right">Mínimo</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const baixo = r.estoqueMin !== null && r.saldo <= r.estoqueMin;
                  return (
                    <TableRow key={r.insumoId} className="border-t border-border">
                      <TableCell className="px-3 py-2 font-medium text-foreground">{r.nome}</TableCell>
                      <TableCell className="px-3 py-2 text-right tabular-nums text-foreground">
                        <span className={baixo ? "font-semibold text-destructive" : undefined}>
                          {nf.format(r.saldo)}
                        </span>{" "}
                        <span className="text-muted-foreground">{r.unidade}</span>
                      </TableCell>
                      {geral && (
                        <TableCell className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {nf.format(r.estoqueMin ?? 0)}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {inicio}–{fim} de {total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label="Página anterior"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <span className="px-2 tabular-nums">
                {page + 1} / {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label="Próxima página"
                disabled={page + 1 >= totalPaginas}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card({
  ativa,
  icone,
  titulo,
  linha1,
  linha2,
  onClick,
}: {
  ativa: boolean;
  icone: React.ReactNode;
  titulo: string;
  linha1: string;
  linha2: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativa ? "true" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-xl bg-card p-4 text-left shadow-sm transition-all",
        ativa
          ? "ring-2 ring-primary"
          : "hover:bg-muted/50 hover:shadow-md",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          ativa ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {icone}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{titulo}</p>
        <p className="truncate text-xs text-muted-foreground">{linha1}</p>
        <p className="mt-1 text-xs text-muted-foreground">{linha2}</p>
      </div>
    </button>
  );
}
