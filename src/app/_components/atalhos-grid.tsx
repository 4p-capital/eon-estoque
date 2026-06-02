import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { MODULES } from "@/app/_components/nav-links";
import { Badge } from "@/components/ui/badge";

// Grade de atalhos da home: um card por módulo, com ícone e descrição.
export function AtalhosGrid() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MODULES.map(({ href, label, icon: Icon, description, soon }, i) => (
        <Link
          key={href}
          href={href}
          className="stagger group relative flex flex-col rounded-lg bg-card p-4 text-card-foreground ring-1 ring-foreground/10 transition-all duration-200 hover:-translate-y-0.5 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ "--i": i } as React.CSSProperties}
        >
          <div className="flex items-start justify-between">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-4.5" aria-hidden />
            </span>
            <ArrowUpRight
              className="size-4 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
              aria-hidden
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <h3 className="font-heading text-sm font-semibold text-foreground">{label}</h3>
            {soon && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                em breve
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </Link>
      ))}
    </section>
  );
}
