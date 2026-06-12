import Link from "next/link";
import { ChevronRight, Truck } from "lucide-react";

import { Tag } from "@/components/ui/tag";
import { statusSaida } from "@/app/saida/_components/status-saida";

export type SaidaResumo = {
  saida_id: string;
  numero: number | null;
  empreendimento_nome: string | null;
  destino: string | null;
  status: string | null;
  qtd_kits: number | null;
  qtd_entregues: number | null;
  qtd_estranhos: number | null;
  created_at: string | null;
  finalizado_em: string | null;
};

// Card-link de uma OS de saída (usado nas listas do hub de expedição).
export function SaidaCard({ saida }: { saida: SaidaResumo }) {
  const status = saida.status ?? "aberta";
  const tag = statusSaida(status);
  const qtd = Number(saida.qtd_kits ?? 0);
  const entregues = Number(saida.qtd_entregues ?? 0);
  const estranhos = Number(saida.qtd_estranhos ?? 0);
  const mostrarConfronto = status !== "aberta" && status !== "cancelada";
  return (
    <Link
      href={`/saida/${saida.saida_id}`}
      className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">
            {saida.numero != null ? `OS #${saida.numero} · ` : ""}
            {saida.empreendimento_nome ?? "—"}
          </span>
          <Tag color={tag.cor}>{tag.label}</Tag>
          {mostrarConfronto && estranhos > 0 && (
            <Tag color="red">{estranhos} bipe(s) estranho(s)</Tag>
          )}
        </div>
        {saida.destino && (
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <Truck className="size-3.5 shrink-0" aria-hidden />
            {saida.destino}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {mostrarConfronto
            ? `${entregues} de ${qtd} recebidos na obra`
            : `${qtd} ${qtd === 1 ? "kit expedido" : "kits expedidos"}`}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
