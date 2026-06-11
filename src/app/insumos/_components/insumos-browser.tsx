"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Layers, Loader2, Search } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { inputCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { InsumosTabela, type LinhaInsumo } from "./insumos-tabela";

export type Empresa = {
  tenantId: string;
  nome: string;
  spes: { empreendimentoId: string; nome: string; qtdInsumos: number }[];
};

const POR_PAGINA = 200;
const GERAL = "geral";

// Estoque de insumos em 2 níveis: empresa (tenant) -> SPE (empreendimento).
// "Geral da empresa" soma as SPEs (saldo_insumo_tenant); cada SPE usa
// saldo_insumo_disponivel (saldo + reservado por etiquetas pendentes).
// Galpão alterna empresas; cliente vê só a sua.
export function InsumosBrowser({ empresas }: { empresas: Empresa[] }) {
  const [empresaId, setEmpresaId] = useState(empresas[0]?.tenantId ?? "");
  const [modo, setModo] = useState<string>(GERAL); // GERAL ou um empreendimentoId
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<LinhaInsumo[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const empresa = empresas.find((e) => e.tenantId === empresaId) ?? empresas[0];
  const geral = modo === GERAL;
  const speAtiva = empresa?.spes.find((s) => s.empreendimentoId === modo);

  function trocarEmpresa(id: string) {
    setEmpresaId(id);
    setModo(GERAL);
    setPage(0);
  }
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

  useEffect(() => {
    if (!empresa) return;
    const supabase = createClient();
    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    const de = page * POR_PAGINA;
    const ate = de + POR_PAGINA - 1;

    (async () => {
      const base = geral
        ? supabase
            .from("saldo_insumo_tenant")
            .select("insumo_id, nome, unidade, saldo, estoque_min", { count: "exact" })
            .eq("tenant_id", empresa.tenantId)
        : supabase
            .from("saldo_insumo_disponivel")
            .select("insumo_id, nome, unidade, saldo, reservado, disponivel", { count: "exact" })
            .eq("empreendimento_id", modo);

      let q = base.gt("saldo", 0); // estoque mostra só o que tem saldo; catálogo fica em Cadastro.
      if (termo) q = q.ilike("nome", `%${termo}%`);
      const { data, count, error } = await q
        .order("saldo", { ascending: false })
        .order("nome", { ascending: true })
        .range(de, ate);

      if (cancelado) return;
      if (error) {
        console.error("[insumos] browser", error);
        setRows([]);
        setTotal(0);
      } else {
        setRows(
          (data ?? []).map((d) => ({
            insumoId: d.insumo_id ?? "",
            nome: d.nome ?? "",
            unidade: d.unidade ?? "",
            saldo: Number(d.saldo ?? 0),
            estoqueMin: geral && "estoque_min" in d ? Number(d.estoque_min ?? 0) : null,
            reservado: !geral && "reservado" in d ? Number(d.reservado ?? 0) : null,
            disponivel: !geral && "disponivel" in d ? Number(d.disponivel ?? 0) : null,
          })),
        );
        setTotal(count ?? 0);
      }
      setCarregando(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [empresa, empresaId, modo, geral, termo, page]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const inicio = total === 0 ? 0 : page * POR_PAGINA + 1;
  const fim = Math.min(total, (page + 1) * POR_PAGINA);

  if (!empresa) {
    return (
      <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Nenhuma empresa com estoque para mostrar.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Seletor de empresa (só quando o galpão vê mais de uma) */}
      {empresas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {empresas.map((e) => (
            <button
              key={e.tenantId}
              type="button"
              onClick={() => trocarEmpresa(e.tenantId)}
              aria-current={e.tenantId === empresaId ? "true" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                e.tenantId === empresaId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50",
              )}
            >
              {e.nome}
            </button>
          ))}
        </div>
      )}

      {/* Cards: geral da empresa + uma por SPE */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          ativa={geral}
          icone={<Layers className="size-5" aria-hidden />}
          titulo="Geral da empresa"
          subtitulo={empresa.nome}
          rodape="Soma das SPEs"
          onClick={() => selecionar(GERAL)}
        />
        {empresa.spes.map((s) => (
          <Card
            key={s.empreendimentoId}
            ativa={modo === s.empreendimentoId}
            icone={<Building2 className="size-5" aria-hidden />}
            titulo={s.nome}
            subtitulo={`${s.qtdInsumos} insumo${s.qtdInsumos === 1 ? "" : "s"} em estoque`}
            onClick={() => selecionar(s.empreendimentoId)}
          />
        ))}
      </div>

      {/* Cabeçalho da visão + busca */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {geral ? `Geral da empresa — ${empresa.nome}` : speAtiva?.nome}
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
            ? `Nenhum insumo com saldo${termo ? ` para “${termo}”` : ""}.`
            : `Nenhum insumo com saldo nesta SPE${termo ? ` para “${termo}”` : ""}.`}
        </p>
      ) : (
        <>
          <InsumosTabela rows={rows} geral={geral} />

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
  subtitulo,
  rodape,
  onClick,
}: {
  ativa: boolean;
  icone: React.ReactNode;
  titulo: string;
  subtitulo: string;
  rodape?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativa ? "true" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-xl bg-card p-4 text-left shadow-sm transition-all",
        ativa ? "ring-2 ring-primary" : "hover:bg-muted/50 hover:shadow-md",
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
        <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>
        {rodape && <p className="mt-1 text-xs text-muted-foreground">{rodape}</p>}
      </div>
    </button>
  );
}
