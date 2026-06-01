import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
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

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        vencido && "bg-red-50 text-red-700",
        proximo && "bg-amber-50 text-amber-800",
        !vencido && !proximo && "bg-bege-claro/60 text-cinza",
      )}
    >
      {texto}
    </span>
  );
}

export function SpeList({ rows, hoje }: { rows: SpeRow[]; hoje: Date }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-bege-claro p-10 text-center">
        <ShieldCheck className="mx-auto size-6 text-cinza/40" aria-hidden />
        <p className="mt-3 text-sm text-cinza/70">
          Nenhum certificado cadastrado ainda. Suba o primeiro .pfx ao lado.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-bege-claro">
      <table className="w-full text-sm">
        <thead className="bg-bege-claro/40 text-left text-xs uppercase tracking-wide text-cinza/60">
          <tr>
            <th className="px-4 py-3 font-medium">Razão social</th>
            <th className="px-4 py-3 font-medium">CNPJ</th>
            <th className="px-4 py-3 font-medium">Empreendimento</th>
            <th className="px-4 py-3 font-medium">Validade</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bege-claro">
          {rows.map((row) => (
            <tr key={row.id} className={cn(!row.ativo && "opacity-50")}>
              <td className="px-4 py-3 font-medium text-preto">{row.razao_social}</td>
              <td className="px-4 py-3 text-cinza">{formatarCnpj(row.cnpj)}</td>
              <td className="px-4 py-3 text-cinza">{row.empreendimento_nome ?? "—"}</td>
              <td className="px-4 py-3">
                <ValidadeBadge validade={row.certificado_validade} hoje={hoje} />
              </td>
              <td className="px-4 py-3 text-right">
                <ExcluirCertificadoButton id={row.id} razaoSocial={row.razao_social} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
