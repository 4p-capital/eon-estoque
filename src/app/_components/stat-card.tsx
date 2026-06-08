import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  // Realça o número quando o valor pede atenção (ex.: itens a comprar).
  alerta?: boolean;
  // Variante azul (gradiente da marca) — destaca os KPIs dos cards dos módulos.
  azul?: boolean;
  // Índice para a entrada escalonada (--i).
  index?: number;
};

// Card de indicador (KPI): chip de ícone + número grande + rótulo.
// Compartilhado pela home (/) e pelo dashboard.
export function StatCard({ icon: Icon, label, value, hint, alerta, azul, index = 0 }: Props) {
  return (
    <Card
      size="sm"
      className={cn(
        "stagger gap-0 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        azul &&
          "border-transparent bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground shadow-md",
      )}
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-lg",
            azul
              ? "bg-white/15 text-primary-foreground"
              : alerta
                ? "bg-destructive/10 text-destructive"
                : "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <p
          className={cn(
            "text-[10px] font-medium uppercase tracking-wide",
            azul ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold tabular-nums tracking-tight",
          azul ? "text-primary-foreground" : alerta ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "mt-0.5 text-xs",
            azul ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      )}
    </Card>
  );
}
