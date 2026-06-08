import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export type InsumoBaixo = { nome: string; saldo: number; unidade: string; estoqueMin: number };

const nf = new Intl.NumberFormat("pt-BR");
const MAX_CHIPS = 6;

// Banner chamativo no topo do Início: insumos com saldo <= estoque mínimo.
// Some quando não há nenhum (return null).
export function AlertaEstoqueMinimo({ itens }: { itens: InsumoBaixo[] }) {
  if (itens.length === 0) {
    return null;
  }
  const n = itens.length;
  const mostrados = itens.slice(0, MAX_CHIPS);
  const resto = n - mostrados.length;

  return (
    <div className="animate-fade-up mb-8 overflow-hidden rounded-2xl border border-warning/30 bg-warning/10 shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
            <AlertTriangle className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-base font-bold text-foreground">
              {n} insumo{n === 1 ? "" : "s"} abaixo do estoque mínimo
            </p>
            <p className="text-sm text-muted-foreground">
              Reponha antes que falte e pare a produção.
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {mostrados.map((i, idx) => (
                <li
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs shadow-sm"
                >
                  <span className="font-medium text-foreground">{i.nome}</span>
                  <span className="font-semibold tabular-nums text-destructive">
                    {nf.format(i.saldo)}
                  </span>
                  <span className="text-muted-foreground">
                    / {nf.format(i.estoqueMin)} {i.unidade}
                  </span>
                </li>
              ))}
              {resto > 0 && (
                <li className="inline-flex items-center rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                  +{resto} {resto === 1 ? "outro" : "outros"}
                </li>
              )}
            </ul>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 bg-card sm:ml-auto">
          <Link href="/insumos">
            Ver estoque
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
