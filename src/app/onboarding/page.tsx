import { redirect } from "next/navigation";

import { LogoEon } from "@/app/_components/logo-eon";
import { OnboardingForm } from "@/app/onboarding/_components/onboarding-form";
import { getSessao } from "@/lib/auth/sessao";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function OnboardingPage() {
  const sessao = await getSessao();
  if (!sessao) {
    redirect("/login");
  }
  if (sessao.papel !== "tenant_admin" || !sessao.tenantId) {
    redirect("/");
  }

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenant")
    .select("nome, onboarding_completo")
    .eq("id", sessao.tenantId)
    .single();
  if (tenant?.onboarding_completo) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoEon className="mb-4 h-8 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Bem-vindo(a)
          </p>
          <h1 className="font-heading mt-1 text-xl font-semibold tracking-tight text-foreground">
            Vamos configurar sua empresa
          </h1>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Confirme o nome da sua empresa para começar a usar a plataforma.
          </p>
        </div>
        <OnboardingForm nomeInicial={tenant?.nome ?? ""} />
      </div>
    </main>
  );
}
