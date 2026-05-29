import type { SaldoInsumo } from "@/lib/types";

const nf = new Intl.NumberFormat("pt-BR");

export function SaldoTable({ saldos }: { saldos: SaldoInsumo[] }) {
  if (saldos.length === 0) {
    return <p className="text-sm text-zinc-500">Nenhum insumo cadastrado ainda.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-bege-claro">
      <table className="w-full text-sm">
        <thead className="bg-bege-claro/40 text-left text-xs uppercase text-cinza/60">
          <tr>
            <th className="px-3 py-2">Insumo</th>
            <th className="px-3 py-2 text-right">Saldo</th>
            <th className="px-3 py-2 text-right">Mínimo</th>
          </tr>
        </thead>
        <tbody>
          {saldos.map((s) => {
            const saldo = s.saldo ?? 0;
            const minimo = s.estoque_min ?? 0;
            const baixo = saldo <= minimo;
            return (
              <tr
                key={s.insumo_id}
                className="border-t border-bege-claro"
              >
                <td className="px-3 py-2 font-medium text-preto">{s.nome}</td>
                <td className="px-3 py-2 text-right tabular-nums text-cinza">
                  <span className={baixo ? "font-semibold text-red-600" : undefined}>
                    {nf.format(saldo)}
                  </span>{" "}
                  <span className="text-cinza/40">{s.unidade}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-cinza/50">
                  {nf.format(minimo)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
