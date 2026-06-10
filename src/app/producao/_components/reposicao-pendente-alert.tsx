"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Tag } from "@/components/ui/tag";
import { marcarReposta } from "@/app/producao/transferencia-actions";
import type { ReposicaoPendente } from "@/lib/types";

// Lembrete persistente das transferências entre SPEs ainda não repostas: a SPE
// de origem cedeu insumo e precisa de reposição. Some quando marcada reposta.
export function ReposicaoPendenteAlert({ pendencias }: { pendencias: ReposicaoPendente[] }) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  if (pendencias.length === 0) return null;

  function marcar(id: string | null) {
    if (!id) return;
    startTransition(async () => {
      const res = await marcarReposta(id);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Reposição confirmada.");
      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-xl bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <ArrowRightLeft className="size-4" aria-hidden />
        Reposições pendentes ({pendencias.length})
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Insumo cedido entre SPEs aguardando reposição na origem. Confirme quando a entrada (NF)
        repuser o estoque.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {pendencias.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0 text-sm">
              <span className="font-medium text-foreground">
                {Number(p.quantidade)} {p.unidade} · {p.insumo_nome}
              </span>{" "}
              <span className="text-muted-foreground">
                de <strong className="font-medium text-foreground">{p.origem_nome}</strong> para{" "}
                <strong className="font-medium text-foreground">{p.destino_nome}</strong>
                {p.motivo ? ` — ${p.motivo}` : ""}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <Tag color="amber">Repor na origem</Tag>
                {p.created_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
            <ConfirmDialog
              title="Confirmar reposição?"
              description={`Confirma que ${p.origem_nome ?? "a SPE de origem"} já recebeu de volta ${Number(p.quantidade)} ${p.unidade ?? ""} de ${p.insumo_nome ?? "insumo"}? O lembrete será encerrado.`}
              confirmLabel="Confirmar reposição"
              triggerAriaLabel={`Marcar reposição de ${p.insumo_nome} como concluída`}
              busy={pendente}
              onConfirm={() => marcar(p.id)}
              triggerClassName="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <CheckCircle2 className="size-4" aria-hidden />
              Marcar reposta
            </ConfirmDialog>
          </li>
        ))}
      </ul>
    </section>
  );
}
