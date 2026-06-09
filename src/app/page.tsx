import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { AlertaEstoqueMinimo, type InsumoBaixo } from "@/app/_components/alerta-estoque-minimo";
import { AtalhosGrid } from "@/app/_components/atalhos-grid";
import { MODULES_GALPAO, MODULES_TENANT } from "@/app/_components/nav-links";
import { VisaoGeralCards } from "@/app/_components/visao-geral-cards";
import { getContexto } from "@/lib/auth/contexto";
import { getSessao } from "@/lib/auth/sessao";
import { getDadosDashboard } from "@/lib/dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// tenant_admin com onboarding pendente -> manda completar o cadastro da empresa.
async function redirecionarSeOnboardingPendente(): Promise<void> {
  const sessao = await getSessao();
  if (sessao?.papel !== "tenant_admin" || !sessao.tenantId) {
    return;
  }
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tenant")
      .select("onboarding_completo")
      .eq("id", sessao.tenantId)
      .single();
    if (data && !data.onboarding_completo) {
      redirect("/onboarding");
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err; // re-lança o redirect
    console.error("[inicio] checar onboarding", err);
  }
}

export const dynamic = "force-dynamic";

// Deriva um primeiro nome amigável a partir do e-mail (ex.: yago.abf → Yago).
function primeiroNome(email: string | null): string | null {
  if (!email) return null;
  const bruto = email.split("@")[0]?.split(/[._-]/)[0];
  if (!bruto) return null;
  return bruto.charAt(0).toUpperCase() + bruto.slice(1);
}

export default async function InicioPage() {
  await redirecionarSeOnboardingPendente();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nome = primeiroNome(user?.email ?? null);

  // Os atalhos refletem o menu do contexto (operação do galpão × área do tenant).
  const contexto = await getContexto();
  const modules = contexto?.modo === "tenant" ? MODULES_TENANT : MODULES_GALPAO;

  const dados = await getDadosDashboard();

  // Insumos com saldo no/abaixo do mínimo — alimentam o banner de alerta no topo.
  const insumosBaixos: InsumoBaixo[] =
    "erro" in dados
      ? []
      : dados.pontos
          .filter((p) => (p.estoque_min ?? 0) > 0 && (p.saldo ?? 0) <= (p.estoque_min ?? 0))
          .map((p) => ({
            nome: p.nome ?? "Insumo",
            saldo: Number(p.saldo ?? 0),
            unidade: p.unidade ?? "",
            estoqueMin: Number(p.estoque_min ?? 0),
          }))
          .sort((a, b) => a.saldo - a.estoqueMin - (b.saldo - b.estoqueMin));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <AlertaEstoqueMinimo itens={insumosBaixos} />

      <header className="animate-fade-up mb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" aria-hidden />
          Controle de Estoque — EON Instalações
        </span>
        <h1 className="font-heading mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Bem-vindo{nome ? ", " : " "}
          <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
            {nome ?? "de volta"}
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Escolha um módulo para gerenciar entrada, estoque, produção e expedição.
        </p>
        {user?.email && (
          <p className="mt-2 text-xs text-muted-foreground">
            Conectado como <span className="font-semibold text-primary">{user.email}</span>
          </p>
        )}
      </header>

      {"erro" in dados ? (
        <ErroSupabase detalhe={dados.erro} />
      ) : (
        <section className="mb-12">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Visão geral
          </h2>
          <VisaoGeralCards kits={dados.kits} pontos={dados.pontos} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Módulos
        </h2>
        <AtalhosGrid modules={modules} />
      </section>
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
