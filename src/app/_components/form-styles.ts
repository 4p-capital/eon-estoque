// Classes Tailwind compartilhadas pelos campos de formulário do app.
// Centralizar aqui evita divergência de estilo entre as telas.
// Usam tokens semânticos (AGENTS.md §5.7) — para forms novos, prefira os
// componentes shadcn/ui (Input, Label, Form).

export const labelCls = "block text-sm font-medium text-foreground";

export const inputCls =
  "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export const cardCls = "rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10";
