"use client";

import { ArrowRightLeft, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";

export type InsumoFaltante = {
  insumoId: string;
  nome: string;
  unidade: string;
  necessario: number;
  disponivel: number;
  falta: number;
};

type Props = {
  qtd: number;
  faltantes: InsumoFaltante[];
  podeTransferir: boolean;
  onTransferir: (faltante: InsumoFaltante) => void;
};

// Representação visual da falta de insumo: uma linha por insumo insuficiente,
// com barra tem/precisa, o quanto falta e a ação de transferir DAQUELE insumo.
export function FaltaInsumosPanel({ qtd, faltantes, podeTransferir, onTransferir }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-destructive/20">
      <div className="flex items-center gap-2 bg-destructive/10 px-4 py-2.5">
        <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden />
        <p className="text-sm font-semibold text-destructive">
          Estoque insuficiente para {qtd} etiqueta(s) — {faltantes.length} insumo(s) em falta
        </p>
      </div>
      <ul className="divide-y divide-border bg-card">
        {faltantes.map((f) => {
          const pct =
            f.necessario > 0 ? Math.min(Math.max(f.disponivel / f.necessario, 0), 1) : 0;
          return (
            <li
              key={f.insumoId}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            >
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate text-sm font-medium text-foreground">{f.nome}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-muted"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-destructive"
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <p className="whitespace-nowrap text-xs text-muted-foreground">
                    tem{" "}
                    <span className="font-semibold text-foreground">
                      {Math.max(f.disponivel, 0)}
                    </span>{" "}
                    de <span className="font-semibold text-foreground">{f.necessario}</span>{" "}
                    {f.unidade}
                  </p>
                </div>
              </div>
              <Tag color="red">
                falta {f.falta} {f.unidade}
              </Tag>
              {podeTransferir && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onTransferir(f)}
                >
                  <ArrowRightLeft className="size-4" aria-hidden />
                  Transferir
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
