import { Construction } from "lucide-react";

import { PageHeader } from "@/app/_components/page-header";

export function EmBreve({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader eyebrow="EON Estoque" title={titulo} description={descricao} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Construction className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-medium text-foreground">Tela em construção</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Estamos trabalhando nisso. Em breve disponível por aqui.
        </p>
      </div>
    </main>
  );
}
