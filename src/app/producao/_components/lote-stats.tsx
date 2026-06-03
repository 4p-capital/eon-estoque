import { cn } from "@/lib/utils";

type Props = {
  impressas: number;
  bipadas: number;
  pendentes: number;
  gap: number;
  meta?: number | null;
  className?: string;
};

const nf = new Intl.NumberFormat("pt-BR");

// Reconciliação compacta de um lote: impressas / bipadas / pendentes (+ gap, meta).
export function LoteStats({ impressas, bipadas, pendentes, gap, meta, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs", className)}>
      <Stat label="Impressas" value={impressas} />
      <Stat label="Bipadas" value={bipadas} tone="success" />
      <Stat label="Pendentes" value={pendentes} tone={pendentes > 0 ? "warning" : undefined} />
      {gap > 0 && <Stat label="Gap" value={gap} tone="destructive" />}
      {meta ? <span className="text-muted-foreground">meta {nf.format(meta)}</span> : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "destructive";
}) {
  const cor =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={cn("text-sm font-semibold tabular-nums", cor)}>{nf.format(value)}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </span>
  );
}
