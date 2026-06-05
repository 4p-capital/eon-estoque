import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { PageHeader } from "@/app/_components/page-header";
import { ProvisionarForm } from "@/app/clientes/_components/provisionar-form";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { getSessao } from "@/lib/auth/sessao";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ClientesPage() {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "galpao_admin") {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data: tenants } = await admin
    .from("tenant")
    .select("id, nome, slug, ativo, onboarding_completo, created_at")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Galpão"
        title="Clientes"
        description="Convide uma construtora cliente: o admin dela recebe um link, completa o cadastro da empresa e passa a enxergar o estoque e a produção das suas SPEs."
      />

      <Card className="mb-8 p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Convidar cliente</h2>
        <ProvisionarForm />
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          Clientes cadastrados {tenants && tenants.length > 0 ? `(${tenants.length})` : ""}
        </h2>
        {!tenants || tenants.length === 0 ? (
          <p className="rounded-lg bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg bg-card">
            {tenants.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{t.nome}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{t.slug}</p>
                </div>
                {!t.onboarding_completo ? (
                  <Tag color="amber">Pendente</Tag>
                ) : (
                  <Tag color={t.ativo ? "green" : "slate"}>{t.ativo ? "Ativo" : "Inativo"}</Tag>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
