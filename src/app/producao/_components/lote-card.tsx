import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Tag, type TagColor } from "@/components/ui/tag";
import { LoteStats } from "@/app/producao/_components/lote-stats";
import type { LoteResumo } from "@/lib/types";

const STATUS_COR: Record<string, TagColor> = {
  aberto: "blue",
  finalizado: "green",
  cancelado: "slate",
};

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

// Card-link de um lote (usado nas listas do hub de produção).
export function LoteCard({ lote }: { lote: LoteResumo }) {
  const status = lote.status ?? "aberto";
  return (
    <Link
      href={`/producao/${lote.lote_id}`}
      className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">{lote.tipo_kit_nome}</span>
          <Tag color={STATUS_COR[status] ?? "slate"}>{STATUS_LABEL[status] ?? status}</Tag>
        </div>
        <p className="truncate text-xs text-muted-foreground">{lote.empreendimento_nome ?? "—"}</p>
        <LoteStats
          impressas={Number(lote.qtd_impressas ?? 0)}
          bipadas={Number(lote.qtd_bipadas ?? 0)}
          pendentes={Number(lote.qtd_pendentes ?? 0)}
          gap={Number(lote.gap ?? 0)}
          meta={lote.meta}
        />
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
