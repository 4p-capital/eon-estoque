import { History } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ESTILO_TIPO: Record<string, { label: string; cls: string }> = {
  recebimento: { label: "Recebimento", cls: "bg-emerald-50 text-emerald-700" },
  recebimento_divergencia: { label: "Divergência", cls: "bg-amber-50 text-amber-800" },
  recusa_nota: { label: "Recusa", cls: "bg-red-50 text-red-700" },
  mapeamento_insumo: { label: "Mapeamento", cls: "bg-bege-claro/60 text-cinza" },
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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-preto">Eventos</h1>
        <p className="mt-1 text-sm text-cinza/70">
          Trilha de auditoria de recebimentos, divergências e recusas — base dos relatórios anti-furto.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Não foi possível carregar os eventos. {error.message}
        </p>
      ) : !eventos || eventos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-bege-claro p-10 text-center">
          <History className="mx-auto size-6 text-cinza/40" aria-hidden />
          <p className="mt-3 text-sm text-cinza/70">Nenhum evento registrado ainda.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {eventos.map((ev) => {
            const estilo = ESTILO_TIPO[ev.tipo] ?? { label: ev.tipo, cls: "bg-bege-claro/60 text-cinza" };
            const det = detalhe(ev.tipo, ev.dados);
            return (
              <li key={ev.id} className="rounded-xl border border-bege-claro bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", estilo.cls)}>
                    {estilo.label}
                  </span>
                  <span className="text-sm font-medium text-preto">{ev.descricao}</span>
                  <span className="ml-auto text-xs text-cinza/50">{quando(ev.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-cinza/60">
                  {nome(ev.empreendimento, "nome") ?? "—"}
                  {nome(ev.nota, "numero") ? ` · nota ${nome(ev.nota, "numero")}` : ""}
                </p>
                {det && <p className="mt-2 text-sm text-cinza">{det}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
