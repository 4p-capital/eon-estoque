"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

import { inputCls } from "@/app/_components/form-styles";
import { EditarInsumoDrawer } from "@/app/insumos/cadastro/_components/editar-insumo-drawer";
import { NovoInsumoDrawer } from "@/app/insumos/cadastro/_components/novo-insumo-drawer";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { Tag } from "@/components/ui/tag";
import { formatarNcm } from "@/lib/fiscal/format";

type Linha = {
  id: string;
  nome: string;
  unidade: string;
  estoqueMin: number;
  leadTime: number;
  consumoDia: number;
  ncm: string | null;
};

const POR_PAGINA = 200;
const nf = new Intl.NumberFormat("pt-BR");

export function CadastroInsumos() {
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Linha[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setTermo(busca.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    const supabase = createClient();
    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    const de = page * POR_PAGINA;
    const ate = de + POR_PAGINA - 1;

    (async () => {
      let q = supabase
        .from("insumo")
        .select("id, nome, unidade, estoque_min, lead_time_dias, consumo_dia, ncm", { count: "exact" });
      if (termo) q = q.ilike("nome", `%${termo}%`);
      const { data, count, error } = await q.order("nome").range(de, ate);
      if (cancelado) return;
      if (error) {
        console.error("[insumos] cadastro lista", error);
        setRows([]);
        setTotal(0);
      } else {
        setRows(
          (data ?? []).map((d) => ({
            id: d.id,
            nome: d.nome,
            unidade: d.unidade,
            estoqueMin: Number(d.estoque_min ?? 0),
            leadTime: Number(d.lead_time_dias ?? 0),
            consumoDia: Number(d.consumo_dia ?? 0),
            ncm: d.ncm ?? null,
          })),
        );
        setTotal(count ?? 0);
      }
      setCarregando(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [termo, page, recarga]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const inicio = total === 0 ? 0 : page * POR_PAGINA + 1;
  const fim = Math.min(total, (page + 1) * POR_PAGINA);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no catálogo…"
            aria-label="Buscar insumo no catálogo"
            className={`${inputCls} pl-9`}
          />
        </div>
        <NovoInsumoDrawer onCreated={() => setRecarga((n) => n + 1)} />
      </div>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum insumo no catálogo{termo ? ` para “${termo}”` : ""}.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <TableRow>
                  <TableHead className="px-3 py-2">Insumo</TableHead>
                  <TableHead className="px-3 py-2">Unidade</TableHead>
                  <TableHead className="px-3 py-2 text-right">Estoque mín.</TableHead>
                  <TableHead className="px-3 py-2 text-right">
                    <span className="sr-only">Editar</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="border-t border-border">
                    <TableCell className="px-3 py-2 font-medium text-foreground">
                      {r.nome}
                      {r.ncm && (
                        <Tag color="blue" className="ml-2 align-middle" title="NCM (classificação fiscal)">
                          {formatarNcm(r.ncm)}
                        </Tag>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">{r.unidade}</TableCell>
                    <TableCell className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {nf.format(r.estoqueMin)}
                    </TableCell>
                    <TableCell className="px-3 py-1 text-right">
                      <EditarInsumoDrawer
                        insumo={{
                          id: r.id,
                          nome: r.nome,
                          unidade: r.unidade,
                          estoqueMin: r.estoqueMin,
                          leadTime: r.leadTime,
                          consumoDia: r.consumoDia,
                          ncm: r.ncm,
                        }}
                        onSaved={() => setRecarga((n) => n + 1)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
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
