import Link from "next/link";
import { QrCode } from "lucide-react";

import { PageHeader } from "@/app/_components/page-header";
import { NovoLoteDrawer } from "@/app/producao/_components/novo-lote-drawer";
import { LoteCard } from "@/app/producao/_components/lote-card";
import { ReposicaoPendenteAlert } from "@/app/producao/_components/reposicao-pendente-alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { LoteResumo, ReposicaoPendente } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProducaoPage() {
  const supabase = await createClient();
  const [kitsRes, empsRes, lotesRes, reposicoesRes] = await Promise.all([
    supabase.from("tipo_kit").select("id, nome").order("nome"),
    supabase.from("empreendimento").select("id, nome").order("nome"),
    supabase.from("lote_resumo_view").select("*").order("created_at", { ascending: false }),
    supabase
      .from("reposicao_pendente_view")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  const kits = (kitsRes.data ?? []).map((k) => ({ id: k.id, nome: k.nome }));
  const empreendimentos = (empsRes.data ?? []).map((e) => ({ id: e.id, nome: e.nome }));
  const lotes = (lotesRes.data ?? []) as LoteResumo[];
  const abertos = lotes.filter((l) => l.status === "aberto");
  const historico = lotes.filter((l) => l.status !== "aberto").slice(0, 20);
  const reposicoes = (reposicoesRes.data ?? []) as ReposicaoPendente[];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        eyebrow="Produção"
        title="Lotes de produção"
        description="Abra um lote, gere as etiquetas com QR conforme produz e bipe a entrada dos kits no depósito."
        action={
          <div className="flex items-center gap-2">
            {kits.length > 0 && (
              <NovoLoteDrawer kits={kits} empreendimentos={empreendimentos} />
            )}
            <Button asChild variant="outline">
              <Link href="/producao/entrada">
                <QrCode className="size-4" aria-hidden />
                Entrada no depósito
              </Link>
            </Button>
          </div>
        }
      />

      <ReposicaoPendenteAlert pendencias={reposicoes} />

      {kits.length === 0 && (
        <p className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
          Nenhum tipo de kit cadastrado. Cadastre um kit e sua composição (BOM) em{" "}
          <span className="font-medium text-foreground">Tipos de kit</span> primeiro.
        </p>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Lotes abertos
        </h2>
        {abertos.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum lote aberto. Clique em “Cadastrar lote” para começar.
          </p>
        ) : (
          <div className="space-y-2">
            {abertos.map((l) => (
              <LoteCard key={l.lote_id} lote={l} />
            ))}
          </div>
        )}
      </section>

      {historico.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Histórico
          </h2>
          <div className="space-y-2">
            {historico.map((l) => (
              <LoteCard key={l.lote_id} lote={l} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
