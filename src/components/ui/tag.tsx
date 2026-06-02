import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Tag colorida para categorias/status. Paleta curada (variedade de cores)
// com legibilidade garantida em claro e escuro — use o `color` semântico
// mais próximo do significado (DESIGN_SYSTEM.md §6: cor comunica, não decora).
const tagVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap leading-tight [&>svg]:size-3",
  {
    variants: {
      color: {
        slate: "border-border bg-muted text-muted-foreground",
        violet: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        blue: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        amber: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        red: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
        teal: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
        orange: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
        pink: "border-pink-500/20 bg-pink-500/10 text-pink-700 dark:text-pink-300",
      },
    },
    defaultVariants: { color: "slate" },
  },
);

export type TagColor = NonNullable<VariantProps<typeof tagVariants>["color"]>;

function Tag({
  className,
  color,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof tagVariants>) {
  return <span data-slot="tag" className={cn(tagVariants({ color }), className)} {...props} />;
}

export { Tag, tagVariants };
