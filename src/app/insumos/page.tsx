import { createClient } from "@/lib/supabase/server";
import { InsumosBrowser, type Empresa } from "@/app/insumos/_components/insumos-browser";
import { PageHeader } from "@/app/_components/page-header";
import { getSessao } from "@/lib/auth/sessao";
import { getContexto, tenantAtivo } from "@/lib/auth/contexto";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  const supabase = await createClient();
  const sessao = await getSessao();
  const contexto = await getContexto(sessao);
  const filtro = tenantAtivo(contexto); // null = galpão em operação vê todas as empresas

  let tenantQuery = supabase.from("tenant").select("id, nome").eq("ativo", true).order("nome");
  let empQuery = supabase.from("empreendimento").select("id, nome, tenant_id").order("nome");
  if (filtro) {
    tenantQuery = tenantQuery.eq("id", filtro);
    empQuery = empQuery.eq("tenant_id", filtro);
  }
  const [tenantsRes, empsRes] = await Promise.all([tenantQuery, empQuery]);
  const empreendimentos = empsRes.data ?? [];

  // Contagem de insumos com saldo por SPE (subtítulo dos cards).
  const contagens = await Promise.all(
    empreendimentos.map(async (e) => {
      const { count } = await supabase
        .from("saldo_insumo_empreendimento")
        .select("insumo_id", { count: "exact", head: true })
        .eq("empreendimento_id", e.id)
        .gt("saldo", 0);
      return [e.id, count ?? 0] as const;
    }),
  );
  const qtdPorEmp = new Map(contagens);

  const empresas: Empresa[] = (tenantsRes.data ?? []).map((t) => ({
    tenantId: t.id,
    nome: t.nome,
    spes: empreendimentos
      .filter((e) => e.tenant_id === t.id)
      .map((e) => ({
        empreendimentoId: e.id,
        nome: e.nome,
        qtdInsumos: qtdPorEmp.get(e.id) ?? 0,
      })),
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Insumos"
        title="Estoque"
        description="Insumos com saldo — por empresa e por SPE. A entrada de material é feita em Entrada."
      />

      {empresas.length === 0 ? (
        <p className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
          Nenhuma empresa com SPE cadastrada ainda.
        </p>
      ) : (
        <InsumosBrowser empresas={empresas} />
      )}
    </main>
  );
}
