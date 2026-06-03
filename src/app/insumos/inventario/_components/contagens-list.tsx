import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { Tag, type TagColor } from "@/components/ui/tag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContagemResumo } from "@/lib/types";

const nf = new Intl.NumberFormat("pt-BR");

const STATUS: Record<string, { label: string; color: TagColor }> = {
  aberta: { label: "Aberta", color: "amber" },
  aplicada: { label: "Aplicada", color: "green" },
  cancelada: { label: "Cancelada", color: "slate" },
};

function quando(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });
}

export function ContagensList({ contagens }: { contagens: ContagemResumo[] }) {
  if (contagens.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <ClipboardCheck className="size-6" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-medium text-foreground">Nenhuma contagem ainda</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Use <span className="font-medium text-foreground">Nova contagem</span> para registrar o
          saldo de abertura ou conferir o estoque de um empreendimento.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 px-4 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Empreendimento
            </TableHead>
            <TableHead className="h-9 px-4 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Itens
            </TableHead>
            <TableHead className="h-9 px-4 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Diferença
            </TableHead>
            <TableHead className="h-9 px-4 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="h-9 px-4 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Data
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contagens.map((c) => {
            const st = STATUS[c.status ?? ""] ?? { label: c.status ?? "—", color: "slate" as TagColor };
            const aplicada = c.status === "aplicada";
            const dif = Number(c.diferenca_total ?? 0);
            return (
              <TableRow key={c.id} className="border-t border-border">
                <TableCell className="px-4 py-3">
                  <Link
                    href={`/insumos/inventario/${c.id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {c.empreendimento_nome ?? "—"}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.regiao?.trim() || "Sem região"}</p>
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                  {nf.format(Number(c.qtd_itens ?? 0))}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm tabular-nums">
                  {aplicada ? (
                    <span className={dif === 0 ? "text-muted-foreground" : "font-semibold text-foreground"}>
                      {dif > 0 ? "+" : ""}
                      {nf.format(dif)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Tag color={st.color}>{st.label}</Tag>
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-xs text-muted-foreground">
                  {quando(c.created_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
