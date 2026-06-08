import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { diasAteValidade, formatarCnpj, formatarData } from "@/lib/fiscal/format";
import { ExcluirCertificadoButton } from "@/app/fiscal/_components/excluir-certificado-button";
import { ObraNomeInline } from "@/app/fiscal/_components/obra-nome-inline";

export type SpeRow = {
  id: string;
  cnpj: string;
  razao_social: string;
  certificado_validade: string;
  ativo: boolean;
  empreendimento_id: string | null;
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

// Lista de certificados em cards — comporta razões sociais longas sem scroll.
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
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div
          key={row.id}
          className={cn("rounded-xl bg-card p-4 shadow-sm", !row.ativo && "opacity-60")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{row.razao_social}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatarCnpj(row.cnpj)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <ValidadeBadge validade={row.certificado_validade} hoje={hoje} />
              <ExcluirCertificadoButton id={row.id} razaoSocial={row.razao_social} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Obra
            </span>
            <ObraNomeInline empreendimentoId={row.empreendimento_id} nome={row.empreendimento_nome} />
          </div>
        </div>
      ))}
    </div>
  );
}
