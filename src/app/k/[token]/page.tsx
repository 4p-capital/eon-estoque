import { Boxes, PackageSearch } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type KitPublico = {
  numero: number;
  tipo_kit_nome: string | null;
  empreendimento_nome: string | null;
  status: string | null;
  fabricado_em: string | null;
  data_producao: string | null;
  lote_id: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Em produção",
  em_estoque: "No depósito",
  expedido: "Expedido",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function dataBR(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));
}

export default async function ConsultaPublicaKit({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("consultar_kit_publico", { p_qr_code: token });
  const kit = (data?.[0] ?? null) as KitPublico | null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-foreground">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <Boxes className="size-5" aria-hidden />
          </span>
          <span className="font-heading text-lg">
            <span className="font-extrabold">EON</span> Produções
          </span>
        </div>

        {kit ? (
          <div className="rounded-2xl bg-card p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Kit {kit.numero}
            </p>
            <h1 className="font-heading mt-1 text-xl font-semibold text-foreground">
              {kit.tipo_kit_nome ?? "Kit"}
            </h1>
            {kit.status && (
              <span className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {STATUS_LABEL[kit.status] ?? kit.status}
              </span>
            )}

            <dl className="mt-5 space-y-3 text-sm">
              <Linha rotulo="Empreendimento" valor={kit.empreendimento_nome ?? "—"} />
              <Linha rotulo="Fabricação" valor={dataBR(kit.fabricado_em)} />
              <Linha rotulo="Data de produção" valor={dataBR(kit.data_producao)} />
              <Linha
                rotulo="Lote"
                valor={kit.lote_id ? kit.lote_id.slice(0, 8).toUpperCase() : "—"}
              />
            </dl>
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
            <PackageSearch className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium text-foreground">Kit não encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              O código lido não corresponde a nenhum kit cadastrado.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Consulta pública · EON Instalações
        </p>
      </div>
    </main>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="text-right font-medium text-foreground">{valor}</dd>
    </div>
  );
}
