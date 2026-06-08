"use client";

import { useState } from "react";
import { Boxes, Building2, Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TipoQtd = { tipoKitId: string; tipoKitNome: string; qtd: number };
export type SpeKits = { empreendimentoId: string; nome: string; total: number; tipos: TipoQtd[] };
export type EmpresaKits = {
  tenantId: string;
  nome: string;
  total: number;
  tipos: TipoQtd[];
  spes: SpeKits[];
};

const GERAL = "geral";
const nf = new Intl.NumberFormat("pt-BR");

// Kits prontos (em_estoque) em 2 níveis: empresa -> SPE -> tipo de kit.
export function KitsEstoqueBrowser({ empresas }: { empresas: EmpresaKits[] }) {
  const [empresaId, setEmpresaId] = useState(empresas[0]?.tenantId ?? "");
  const [modo, setModo] = useState<string>(GERAL);

  const empresa = empresas.find((e) => e.tenantId === empresaId) ?? empresas[0];
  const geral = modo === GERAL;
  const spe = empresa?.spes.find((s) => s.empreendimentoId === modo);
  const tipos = geral ? (empresa?.tipos ?? []) : (spe?.tipos ?? []);

  if (!empresa) {
    return (
      <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Nenhum kit pronto em estoque ainda.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {empresas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {empresas.map((e) => (
            <button
              key={e.tenantId}
              type="button"
              onClick={() => {
                setEmpresaId(e.tenantId);
                setModo(GERAL);
              }}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          ativa={geral}
          icone={<Layers className="size-5" aria-hidden />}
          titulo="Geral da empresa"
          subtitulo={empresa.nome}
          total={empresa.total}
          onClick={() => setModo(GERAL)}
        />
        {empresa.spes.map((s) => (
          <Card
            key={s.empreendimentoId}
            ativa={modo === s.empreendimentoId}
            icone={<Building2 className="size-5" aria-hidden />}
            titulo={s.nome}
            subtitulo="kits prontos"
            total={s.total}
            onClick={() => setModo(s.empreendimentoId)}
          />
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {geral ? `Geral da empresa — ${empresa.nome}` : spe?.nome}
        </h2>
        {tipos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhum kit pronto em estoque.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <TableRow>
                  <TableHead className="px-3 py-2">Tipo de kit</TableHead>
                  <TableHead className="px-3 py-2 text-right">Em estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((t) => (
                  <TableRow key={t.tipoKitId} className="border-t border-border">
                    <TableCell className="px-3 py-2 font-medium text-foreground">
                      {t.tipoKitNome}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">
                      {nf.format(t.qtd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  ativa,
  icone,
  titulo,
  subtitulo,
  total,
  onClick,
}: {
  ativa: boolean;
  icone: React.ReactNode;
  titulo: string;
  subtitulo: string;
  total: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativa ? "true" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl bg-card p-4 text-left shadow-sm transition-all",
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
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{titulo}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>
      </div>
      <span className="flex items-center gap-1 text-lg font-semibold tabular-nums text-foreground">
        <Boxes className="size-4 text-muted-foreground" aria-hidden />
        {nf.format(total)}
      </span>
    </button>
  );
}
