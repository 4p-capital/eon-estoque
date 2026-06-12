import { Tag, type TagColor } from "@/components/ui/tag";
import type { OsPublica } from "@/app/os/[token]/recebimento-schema";

const DESFECHO: Record<string, { label: string; cor: TagColor; descricao: string }> = {
  recebida: {
    label: "Recebida",
    cor: "green",
    descricao: "Todos os kits da OS foram bipados na obra.",
  },
  recebida_divergencia: {
    label: "Recebida com divergência",
    cor: "amber",
    descricao: "O recebimento foi confirmado com divergência registrada.",
  },
  recusada: {
    label: "Recusada",
    cor: "red",
    descricao: "A carga não foi aceita na obra e volta no caminhão.",
  },
};

function dataHoraBR(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Estado final da página pública: o comprovante do desfecho (somente leitura).
export function Comprovante({ os, totais }: { os: OsPublica["os"]; totais: { entregues: number; total: number; estranhos: number } }) {
  const desfecho = DESFECHO[os.status];
  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Comprovante de recebimento
        </h2>
        {desfecho && <Tag color={desfecho.cor}>{desfecho.label}</Tag>}
      </div>
      {desfecho && <p className="mt-1 text-sm text-muted-foreground">{desfecho.descricao}</p>}

      <dl className="mt-4 space-y-2.5 text-sm">
        <Linha rotulo="Kits recebidos" valor={`${totais.entregues} de ${totais.total}`} />
        {totais.estranhos > 0 && (
          <Linha rotulo="Bipes estranhos" valor={String(totais.estranhos)} />
        )}
        <Linha rotulo="Recebido por" valor={os.recebedor_nome ?? "—"} />
        <Linha rotulo="CPF" valor={os.recebedor_cpf_mascarado ?? "—"} />
        <Linha rotulo="Confirmado em" valor={dataHoraBR(os.recebido_em)} />
        {os.recusa_motivo && <Linha rotulo="Motivo da recusa" valor={os.recusa_motivo} />}
      </dl>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="text-right font-medium text-foreground">{valor}</dd>
    </div>
  );
}
