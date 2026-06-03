"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { criarInsumo, type FormState } from "@/app/insumos/actions";
import { inputCls, labelCls } from "@/app/_components/form-styles";
import { SubmitButton } from "@/app/_components/submit-button";
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

type Linha = {
  id: string;
  nome: string;
  unidade: string;
  estoqueMin: number;
};

const POR_PAGINA = 200;
const INITIAL: FormState = { status: "idle" };
const nf = new Intl.NumberFormat("pt-BR");

export function CadastroInsumos() {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Linha[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [recarga, setRecarga] = useState(0);

  const [state, formAction] = useActionState(criarInsumo, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setTermo(busca.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    if (state.status === "ok") {
      toast.success(state.message ?? "Insumo cadastrado.");
      formRef.current?.reset();
      // Recarrega a lista após cadastrar (reage à mudança de `state`, não a render).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecarga((n) => n + 1);
    } else if (state.status === "error") {
      toast.error(state.message ?? "Erro ao salvar.");
    }
  }, [state]);

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
        .select("id, nome, unidade, estoque_min", { count: "exact" });
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
        <Button type="button" onClick={() => setAberto((a) => !a)}>
          {aberto ? <X className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          {aberto ? "Fechar" : "Cadastrar insumo"}
        </Button>
      </div>

      {aberto && (
        <form
          ref={formRef}
          action={formAction}
          className="animate-fade-in space-y-4 rounded-xl bg-card p-5 shadow-sm"
        >
          <div>
            <label htmlFor="nome" className={labelCls}>
              Nome
            </label>
            <input id="nome" name="nome" required className={inputCls} placeholder="Fio flexível 2,5mm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="unidade" className={labelCls}>
                Unidade
              </label>
              <input id="unidade" name="unidade" required className={inputCls} placeholder="m" />
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
                defaultValue={0}
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
                defaultValue={0}
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
                defaultValue={0}
                className={inputCls}
              />
            </div>
          </div>
          <SubmitButton className="w-full">Cadastrar insumo</SubmitButton>
        </form>
      )}

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="border-t border-border">
                    <TableCell className="px-3 py-2 font-medium text-foreground">{r.nome}</TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">{r.unidade}</TableCell>
                    <TableCell className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {nf.format(r.estoqueMin)}
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
