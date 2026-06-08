import Link from "next/link";
import { ChevronRight, Truck } from "lucide-react";

import { Tag, type TagColor } from "@/components/ui/tag";

export type SaidaResumo = {
  saida_id: string;
  empreendimento_nome: string | null;
  destino: string | null;
  status: string | null;
  qtd_kits: number | null;
  created_at: string | null;
  finalizado_em: string | null;
};

const STATUS_COR: Record<string, TagColor> = {
  aberta: "blue",
  finalizada: "green",
  cancelada: "slate",
};
const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

// Card-link de uma remessa de saída (usado nas listas do hub de expedição).
export function SaidaCard({ saida }: { saida: SaidaResumo }) {
  const status = saida.status ?? "aberta";
  const qtd = Number(saida.qtd_kits ?? 0);
  return (
    <Link
      href={`/saida/${saida.saida_id}`}
      className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">
            {saida.empreendimento_nome ?? "—"}
          </span>
          <Tag color={STATUS_COR[status] ?? "slate"}>{STATUS_LABEL[status] ?? status}</Tag>
        </div>
        {saida.destino && (
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <Truck className="size-3.5 shrink-0" aria-hidden />
            {saida.destino}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {qtd} {qtd === 1 ? "kit expedido" : "kits expedidos"}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
