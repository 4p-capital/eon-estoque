import { CheckCircle2, Circle, TriangleAlert } from "lucide-react";

import type { BipeEstranho, KitPublico } from "@/app/os/[token]/recebimento-schema";

function horaBR(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Conferência visual da OS: cada kit expedido com seu estado de recebimento,
// e os bipes estranhos (QRs que não pertencem à OS) destacados como divergência.
export function KitsChecklist({
  kits,
  estranhos,
}: {
  kits: KitPublico[];
  estranhos: BipeEstranho[];
}) {
  return (
    <div className="space-y-4">
      <ul className="space-y-1.5">
        {kits.map((k) => {
          const recebido = k.status === "entregue";
          return (
            <li
              key={k.numero}
              className="flex items-center gap-2 rounded-lg bg-card px-3 py-2.5 text-sm shadow-sm"
            >
              {recebido ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
              )}
              <span className="font-medium text-foreground">Kit #{k.numero}</span>
              <span className="truncate text-xs text-muted-foreground">
                {k.tipo_kit_nome ?? "Kit"}
              </span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {recebido ? `${horaBR(k.entregue_em)} · recebido` : "aguardando bipe"}
              </span>
            </li>
          );
        })}
      </ul>

      {estranhos.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
            <TriangleAlert className="size-3.5" aria-hidden />
            Bipes que não pertencem a esta OS ({estranhos.length})
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {estranhos.map((e) => (
              <li key={e.qr_code} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-foreground">{e.motivo}</span>
                <span>
                  {horaBR(e.bipado_em)} · {e.qr_code.slice(0, 8)}…
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Isso conta como divergência no fechamento.
          </p>
        </div>
      )}
    </div>
  );
}
