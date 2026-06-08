import { redirect } from "next/navigation";

import { PageHeader } from "@/app/_components/page-header";
import { ConvidarForm } from "@/app/equipe/_components/convidar-form";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { getSessao } from "@/lib/auth/sessao";
import type { Papel } from "@/lib/auth/papel";
import { createAdminClient } from "@/lib/supabase/admin";

const PAPEL_LABEL: Record<string, string> = {
  galpao_admin: "Administrador",
  galpao_operador: "Operador",
  tenant_admin: "Administrador",
  tenant_gestor: "Gestor",
};
const PAPEL_ADMIN = new Set(["galpao_admin", "tenant_admin"]);

export default async function EquipePage() {
  const sessao = await getSessao();
  const ehGalpao = sessao?.papel === "galpao_admin";
  const ehTenant = sessao?.papel === "tenant_admin";
  if (!sessao?.tenantId || (!ehGalpao && !ehTenant)) {
    redirect("/");
  }

  const papeis: Papel[] = ehGalpao
    ? ["galpao_admin", "galpao_operador"]
    : ["tenant_admin", "tenant_gestor"];

  const admin = createAdminClient();
  const { data: membros } = await admin
    .from("perfil")
    .select("id, nome, email, papel, created_at")
    .eq("tenant_id", sessao.tenantId)
    .in("papel", papeis)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow={ehGalpao ? "Operação" : "Cliente"}
        title={ehGalpao ? "Equipe do galpão" : "Equipe"}
        description={
          ehGalpao
            ? "Convide administradores e operadores da operação do galpão. Eles veem o operacional de todos os clientes conforme o papel."
            : "Convide administradores e gestores da sua empresa. Eles passam a ver o estoque e a produção das suas SPEs conforme o papel."
        }
      />

      <Card className="mb-8 p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Convidar membro</h2>
        <ConvidarForm galpao={ehGalpao} />
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          Membros {membros && membros.length > 0 ? `(${membros.length})` : ""}
        </h2>
        {!membros || membros.length === 0 ? (
          <p className="rounded-lg bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhum membro ainda.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg bg-card">
            {membros.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white">
                  {(m.nome ?? m.email ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m.nome ?? "—"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
                </div>
                <Tag color={PAPEL_ADMIN.has(m.papel) ? "blue" : "slate"}>
                  {PAPEL_LABEL[m.papel] ?? m.papel}
                </Tag>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
