import Link from "next/link";
import { Pencil, Wrench } from "lucide-react";

import { Tag } from "@/components/ui/tag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type KitRow = {
  id: string | null;
  nome: string | null;
  descricao: string | null;
  qtdInsumos: number;
  qtdPossivel: number;
  gargalo: string | null;
};

const nf = new Intl.NumberFormat("pt-BR");

export function KitsList({ kits }: { kits: KitRow[] }) {
  if (kits.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Wrench className="size-6" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-medium text-foreground">Nenhum kit cadastrado</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Use o botão <span className="font-medium text-foreground">Cadastrar kit</span> acima para
          criar a receita (BOM) do primeiro kit.
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
              Kit
            </TableHead>
            <TableHead className="h-9 px-4 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Insumos
            </TableHead>
            <TableHead className="h-9 px-4 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Kits possíveis
            </TableHead>
            <TableHead className="h-9 px-4 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Gargalo
            </TableHead>
            <TableHead className="h-9 w-10 px-4">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kits.map((k) => (
            <TableRow key={k.id ?? k.nome} className="border-t border-border">
              <TableCell className="px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{k.nome ?? "—"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {k.descricao?.trim() || "Sem descrição"}
                </p>
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {nf.format(k.qtdInsumos)}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {k.qtdInsumos === 1 ? "insumo" : "insumos"}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <span
                  className={`text-base font-semibold tabular-nums ${
                    k.qtdPossivel > 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {nf.format(k.qtdPossivel)}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3">
                {k.gargalo ? (
                  <Tag color="amber">{k.gargalo}</Tag>
                ) : (
                  <Tag color="green">Sem gargalo</Tag>
                )}
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                {k.id && (
                  <Link
                    href={`/tipos-kit/${k.id}`}
                    aria-label={`Editar ${k.nome ?? "kit"}`}
                    title="Editar kit"
                    className="inline-flex rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
