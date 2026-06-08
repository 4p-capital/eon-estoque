import { PageHeader } from "@/app/_components/page-header";
import { NovaSaidaDrawer } from "@/app/saida/_components/nova-saida-drawer";
import { SaidaCard, type SaidaResumo } from "@/app/saida/_components/saida-card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SaidaPage() {
  const supabase = await createClient();
  const [empsRes, saidasRes] = await Promise.all([
    supabase.from("empreendimento").select("id, nome").order("nome"),
    supabase.from("saida_resumo_view").select("*").order("created_at", { ascending: false }),
  ]);

  const empreendimentos = (empsRes.data ?? []).map((e) => ({ id: e.id, nome: e.nome }));
  const saidas = (saidasRes.data ?? []) as SaidaResumo[];
  const abertas = saidas.filter((s) => s.status === "aberta");
  const historico = saidas.filter((s) => s.status !== "aberta").slice(0, 20);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        eyebrow="Expedição"
        title="Saídas"
        description="Abra uma remessa por empreendimento e bipe o QR de cada kit na saída. Cada remessa fica registrada pra consulta."
        action={
          empreendimentos.length > 0 ? <NovaSaidaDrawer empreendimentos={empreendimentos} /> : undefined
        }
      />

      {empreendimentos.length === 0 && (
        <p className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
          Nenhum empreendimento cadastrado ainda.
        </p>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Remessas abertas
        </h2>
        {abertas.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma saída aberta. Clique em “Nova saída” para começar.
          </p>
        ) : (
          <div className="space-y-2">
            {abertas.map((s) => (
              <SaidaCard key={s.saida_id} saida={s} />
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
            {historico.map((s) => (
              <SaidaCard key={s.saida_id} saida={s} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
