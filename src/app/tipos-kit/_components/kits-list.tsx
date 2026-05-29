import Link from "next/link";
import { Pencil } from "lucide-react";

import type { KitPossivel } from "@/lib/types";

const nf = new Intl.NumberFormat("pt-BR");

export function KitsList({ kits }: { kits: KitPossivel[] }) {
  if (kits.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-bege-claro bg-bege-claro/20 p-6 text-sm text-cinza/70">
        Nenhum kit cadastrado ainda. Crie o primeiro ao lado.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {kits.map((k) => (
        <div
          key={k.tipo_kit_id}
          className="rounded-lg border border-bege-claro bg-white p-4"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium text-preto">{k.tipo_kit_nome}</span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm text-cinza/70">
                <span className="font-semibold tabular-nums text-preto">
                  {nf.format(k.qtd_possivel ?? 0)}
                </span>{" "}
                possíveis
              </span>
              {k.tipo_kit_id && (
                <Link
                  href={`/tipos-kit/${k.tipo_kit_id}`}
                  aria-label={`Editar ${k.tipo_kit_nome ?? "kit"}`}
                  title="Editar kit"
                  className="rounded-md p-1.5 text-cinza/50 transition-colors hover:bg-bege-claro hover:text-preto"
                >
                  <Pencil className="size-4" aria-hidden />
                </Link>
              )}
            </div>
          </div>
          {k.insumo_gargalo_nome && (
            <p className="mt-1 text-xs text-cinza/60">
              Gargalo: <span className="font-medium text-preto">{k.insumo_gargalo_nome}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
