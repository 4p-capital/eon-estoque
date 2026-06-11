import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LinhaInsumo = {
  insumoId: string;
  nome: string;
  unidade: string;
  saldo: number;
  estoqueMin: number | null;
  reservado: number | null;
  disponivel: number | null;
};

const nf = new Intl.NumberFormat("pt-BR");

// Tabela do estoque. Na visão por SPE mostra também reservado (etiquetas
// pendentes) e disponível = saldo − reservado — os mesmos números que a
// produção e a transferência entre SPEs enxergam.
export function InsumosTabela({ rows, geral }: { rows: LinhaInsumo[]; geral: boolean }) {
  const temReserva = !geral && rows.some((r) => (r.reservado ?? 0) > 0);
  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <TableRow>
            <TableHead className="px-3 py-2">Insumo</TableHead>
            <TableHead className="px-3 py-2 text-right">Saldo</TableHead>
            {geral ? (
              <TableHead className="px-3 py-2 text-right">Mínimo</TableHead>
            ) : (
              <>
                <TableHead className="px-3 py-2 text-right">Reservado</TableHead>
                <TableHead className="px-3 py-2 text-right">Disponível</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const baixo = r.estoqueMin !== null && r.estoqueMin > 0 && r.saldo <= r.estoqueMin;
            const reservado = r.reservado ?? 0;
            const disponivel = r.disponivel ?? r.saldo;
            return (
              <TableRow key={r.insumoId} className="border-t border-border">
                <TableCell className="px-3 py-2 font-medium text-foreground">{r.nome}</TableCell>
                <TableCell className="px-3 py-2 text-right tabular-nums text-foreground">
                  <span className={baixo ? "font-semibold text-destructive" : undefined}>
                    {nf.format(r.saldo)}
                  </span>{" "}
                  <span className="text-muted-foreground">{r.unidade}</span>
                </TableCell>
                {geral ? (
                  <TableCell className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {nf.format(r.estoqueMin ?? 0)}
                  </TableCell>
                ) : (
                  <>
                    <TableCell
                      className={`px-3 py-2 text-right tabular-nums ${
                        reservado > 0 ? "text-warning" : "text-muted-foreground"
                      }`}
                    >
                      {nf.format(reservado)}
                    </TableCell>
                    <TableCell
                      className={`px-3 py-2 text-right font-semibold tabular-nums ${
                        disponivel <= 0 ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {nf.format(disponivel)}
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {temReserva && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Reservado = etiquetas pendentes (impressas e ainda não bipadas) de lotes desta SPE.
          Disponível = saldo − reservado.
        </p>
      )}
    </div>
  );
}
