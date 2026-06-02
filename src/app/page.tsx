import { AtalhosGrid } from "@/app/_components/atalhos-grid";
import { PageHeader } from "@/app/_components/page-header";
import { DashboardConteudo } from "@/app/dashboard/_components/dashboard-conteudo";
import { getDadosDashboard } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Deriva um primeiro nome amigável a partir do e-mail (ex.: yago.abf → Yago).
function primeiroNome(email: string | null): string | null {
  if (!email) return null;
  const bruto = email.split("@")[0]?.split(/[._-]/)[0];
  if (!bruto) return null;
  return bruto.charAt(0).toUpperCase() + bruto.slice(1);
}

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nome = primeiroNome(user?.email ?? null);

  const dados = await getDadosDashboard();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        eyebrow="EON Estoque"
        title={nome ? `Bem-vindo, ${nome}` : "Bem-vindo"}
        description="Capacidade de produção, alertas de compra e acesso rápido aos módulos."
      />

      {"erro" in dados ? (
        <ErroSupabase detalhe={dados.erro} />
      ) : (
        <div className="space-y-12">
          <DashboardConteudo kits={dados.kits} pontos={dados.pontos} />
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Módulos
            </h2>
            <AtalhosGrid />
          </section>
        </div>
      )}
    </main>
  );
}

function ErroSupabase({ detalhe }: { detalhe: string }) {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-6 text-sm text-foreground">
      <p className="font-medium">Supabase ainda não conectado.</p>
      <p className="mt-2 text-muted-foreground">
        Configure o <code>.env.local</code> e rode as migrations
        (<code>supabase db reset</code> no local, ou conecte um projeto na nuvem).
        Detalhe técnico: {detalhe}
      </p>
    </div>
  );
}
