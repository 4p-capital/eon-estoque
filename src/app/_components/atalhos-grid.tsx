import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { type ChipColor, type ModuleLink } from "@/app/_components/nav-links";
import { Badge } from "@/components/ui/badge";

// Gradiente do chip de ícone e do CTA por módulo (variedade de cor, estilo SaaS).
const GRAD: Record<ChipColor, string> = {
  violet: "from-violet-500 to-violet-700",
  blue: "from-blue-500 to-indigo-600",
  teal: "from-teal-400 to-cyan-600",
  amber: "from-amber-400 to-orange-500",
  pink: "from-pink-500 to-fuchsia-600",
  green: "from-emerald-500 to-teal-600",
  orange: "from-orange-400 to-rose-500",
};

const SHADOW: Record<ChipColor, string> = {
  violet: "shadow-violet-500/30",
  blue: "shadow-blue-500/30",
  teal: "shadow-teal-500/30",
  amber: "shadow-amber-500/30",
  pink: "shadow-pink-500/30",
  green: "shadow-emerald-500/30",
  orange: "shadow-orange-500/30",
};

const TEXT: Record<ChipColor, string> = {
  violet: "text-violet-600 dark:text-violet-400",
  blue: "text-blue-600 dark:text-blue-400",
  teal: "text-teal-600 dark:text-teal-400",
  amber: "text-amber-600 dark:text-amber-400",
  pink: "text-pink-600 dark:text-pink-400",
  green: "text-emerald-600 dark:text-emerald-400",
  orange: "text-orange-600 dark:text-orange-400",
};

export function AtalhosGrid({ modules }: { modules: readonly ModuleLink[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map(({ href, label, icon: Icon, description, color, soon }, i) => (
        <Link
          key={href}
          href={href}
          className="stagger group relative flex flex-col overflow-hidden rounded-2xl bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          style={{ "--i": i } as React.CSSProperties}
        >
          {/* brilho de cor no topo ao passar o mouse */}
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 -top-px h-1 bg-gradient-to-r ${GRAD[color]} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
          />
          <div className="flex items-start justify-between">
            <span
              className={`inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${GRAD[color]} text-white shadow-lg ${SHADOW[color]} transition-transform duration-300 group-hover:scale-105`}
            >
              <Icon className="size-5.5" aria-hidden />
            </span>
            {soon && (
              <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                em breve
              </Badge>
            )}
          </div>

          <h3 className="font-heading mt-4 text-base font-bold tracking-tight text-foreground">
            {label}
          </h3>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>

          <span
            className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${TEXT[color]} transition-all duration-300 group-hover:gap-2`}
          >
            {soon ? "Em breve" : "Acessar"}
            {!soon && <ArrowRight className="size-4" aria-hidden />}
          </span>
        </Link>
      ))}
    </section>
  );
}
