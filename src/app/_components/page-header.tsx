import { cn } from "@/lib/utils";

type Props = {
  // Rótulo curto em azul acima do título (eyebrow).
  eyebrow?: string;
  title: string;
  description?: string;
  // Ação opcional à direita (ex.: botão).
  action?: React.ReactNode;
  className?: string;
};

// Cabeçalho de página padrão: eyebrow azul + título display + descrição.
// Padroniza a hierarquia e a personalidade em todas as telas (AGENTS.md §5.7).
export function PageHeader({ eyebrow, title, description, action, className }: Props) {
  return (
    <header
      className={cn(
        "animate-fade-up mb-6 flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-[12px] text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
