import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { diasAteValidade, formatarCnpj, formatarData } from "@/lib/fiscal/format";
import { ExcluirCertificadoButton } from "@/app/fiscal/_components/excluir-certificado-button";

export type SpeRow = {
  id: string;
  cnpj: string;
  razao_social: string;
  certificado_validade: string;
  ativo: boolean;
  empreendimento_nome: string | null;
};

const DIAS_ALERTA = 30;

function ValidadeBadge({ validade, hoje }: { validade: string; hoje: Date }) {
  const dias = diasAteValidade(validade, hoje);
  const vencido = dias < 0;
  const proximo = dias >= 0 && dias <= DIAS_ALERTA;

  const texto = vencido
    ? "Vencido"
    : proximo
      ? `Vence em ${dias} dia${dias === 1 ? "" : "s"}`
      : formatarData(validade);

  if (vencido) {
    return <Badge variant="destructive">{texto}</Badge>;
  }

  if (proximo) {
    return <Badge className="bg-warning/15 text-warning border-transparent">{texto}</Badge>;
  }

  return <Badge className="bg-success/15 text-success border-transparent">{texto}</Badge>;
}

export function SpeList({ rows, hoje }: { rows: SpeRow[]; hoje: Date }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum certificado cadastrado ainda. Clique em “Cadastrar certificado” para subir o
          primeiro .pfx.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
              Razão social
            </TableHead>
            <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
              CNPJ
            </TableHead>
            <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
              Empreendimento
            </TableHead>
            <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
              Validade
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-xs uppercase tracking-wide text-muted-foreground">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={cn(!row.ativo && "opacity-50")}>
              <TableCell className="px-4 py-3 font-medium text-foreground">
                {row.razao_social}
              </TableCell>
              <TableCell className="px-4 py-3 text-foreground">{formatarCnpj(row.cnpj)}</TableCell>
              <TableCell className="px-4 py-3 text-foreground">
                {row.empreendimento_nome ?? "—"}
              </TableCell>
              <TableCell className="px-4 py-3">
                <ValidadeBadge validade={row.certificado_validade} hoje={hoje} />
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <ExcluirCertificadoButton id={row.id} razaoSocial={row.razao_social} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
