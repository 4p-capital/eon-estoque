import { History } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/app/_components/page-header";
import { Tag, type TagColor } from "@/components/ui/tag";

export const dynamic = "force-dynamic";

const ESTILO_TIPO: Record<string, { label: string; color: TagColor }> = {
  recebimento: { label: "Recebimento", color: "green" },
  recebimento_divergencia: { label: "Divergência", color: "amber" },
  recusa_nota: { label: "Recusa", color: "red" },
  mapeamento_insumo: { label: "Mapeamento", color: "blue" },
};

function nome(rel: unknown, campo: string): string | null {
  const obj = Array.isArray(rel) ? rel[0] : rel;
  if (obj && typeof obj === "object" && campo in obj) {
    const v = (obj as Record<string, unknown>)[campo];
    return v == null ? null : String(v);
  }
  return null;
}

function detalhe(tipo: string, dados: unknown): string | null {
  if (!dados || typeof dados !== "object") return null;
  const d = dados as Record<string, unknown>;
  if (tipo === "recusa_nota") {
    return d.motivo ? `Motivo: ${String(d.motivo)}` : null;
  }
  if (tipo === "recebimento_divergencia" && Array.isArray(d.divergencias)) {
    return d.divergencias
      .map((x) => {
        const i = x as Record<string, unknown>;
        return `${i.descricao}: esperado ${i.esperado}, recebido ${i.recebido} (faltou ${i.falta})`;
      })
      .join(" · ");
  }
  return null;
}

function quando(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function EventosPage() {
  const supabase = await createClient();
  const { data: eventos, error } = await supabase
    .from("evento")
    .select("id, tipo, descricao, dados, created_at, nota:nota_id(numero), empreendimento:empreendimento_id(nome)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Eventos"
        title="Eventos"
        description="Trilha de auditoria de recebimentos, divergências e recusas — base dos relatórios anti-furto."
      />

      {error ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
          Não foi possível carregar os eventos. {error.message}
        </p>
      ) : !eventos || eventos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <History className="mx-auto size-6 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {eventos.map((ev) => {
            const estilo =
              ESTILO_TIPO[ev.tipo] ?? { label: ev.tipo, color: "slate" as TagColor };
            const det = detalhe(ev.tipo, ev.dados);
            return (
              <li key={ev.id} className="rounded-xl bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag color={estilo.color}>{estilo.label}</Tag>
                  <span className="text-sm font-medium text-foreground">{ev.descricao}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{quando(ev.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nome(ev.empreendimento, "nome") ?? "—"}
                  {nome(ev.nota, "numero") ? ` · nota ${nome(ev.nota, "numero")}` : ""}
                </p>
                {det && <p className="mt-2 text-sm text-foreground">{det}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
