import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/app/_components/page-header";
import { Button } from "@/components/ui/button";
import {
  KitsEstoqueBrowser,
  type EmpresaKits,
  type TipoQtd,
} from "@/app/producao/estoque/_components/kits-estoque-browser";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth/sessao";
import { getContexto, tenantAtivo } from "@/lib/auth/contexto";

export const dynamic = "force-dynamic";

function acumular(arr: TipoQtd[], id: string, nome: string, qtd: number) {
  const found = arr.find((t) => t.tipoKitId === id);
  if (found) found.qtd += qtd;
  else arr.push({ tipoKitId: id, tipoKitNome: nome, qtd });
}

export default async function KitsEstoquePage() {
  const supabase = await createClient();
  const sessao = await getSessao();
  const contexto = await getContexto(sessao);
  const filtro = tenantAtivo(contexto);

  let kitsQuery = supabase
    .from("kits_em_estoque_view")
    .select("empreendimento_id, empreendimento_nome, tipo_kit_id, tipo_kit_nome, qtd, tenant_id");
  let tenantQuery = supabase.from("tenant").select("id, nome").eq("ativo", true);
  if (filtro) {
    kitsQuery = kitsQuery.eq("tenant_id", filtro);
    tenantQuery = tenantQuery.eq("id", filtro);
  }
  const [kitsRes, tenantsRes] = await Promise.all([kitsQuery, tenantQuery]);

  const rows = kitsRes.data ?? [];
  const nomeEmpresa = new Map((tenantsRes.data ?? []).map((t) => [t.id, t.nome]));

  const porEmpresa = new Map<string, EmpresaKits>();
  for (const r of rows) {
    const tid = r.tenant_id ?? "";
    let emp = porEmpresa.get(tid);
    if (!emp) {
      emp = { tenantId: tid, nome: nomeEmpresa.get(tid) ?? "Empresa", total: 0, tipos: [], spes: [] };
      porEmpresa.set(tid, emp);
    }
    const qtd = Number(r.qtd ?? 0);
    const tipoId = r.tipo_kit_id ?? "";
    const tipoNome = r.tipo_kit_nome ?? "Kit";
    emp.total += qtd;
    acumular(emp.tipos, tipoId, tipoNome, qtd);

    const empId = r.empreendimento_id ?? "";
    let spe = emp.spes.find((s) => s.empreendimentoId === empId);
    if (!spe) {
      spe = { empreendimentoId: empId, nome: r.empreendimento_nome ?? "—", total: 0, tipos: [] };
      emp.spes.push(spe);
    }
    spe.total += qtd;
    acumular(spe.tipos, tipoId, tipoNome, qtd);
  }

  const empresas = [...porEmpresa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  for (const e of empresas) {
    e.tipos.sort((a, b) => b.qtd - a.qtd);
    e.spes.sort((a, b) => a.nome.localeCompare(b.nome));
    for (const s of e.spes) s.tipos.sort((a, b) => b.qtd - a.qtd);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        eyebrow="Produção · estoque"
        title="Kits em estoque"
        description="Kits prontos aguardando saída — por empresa e por SPE, com o total por tipo de kit."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/producao">
              <ArrowLeft className="size-4" aria-hidden />
              Voltar
            </Link>
          </Button>
        }
      />

      {empresas.length === 0 ? (
        <p className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
          Nenhum kit pronto em estoque. Produza um lote e bipe a entrada no depósito.
        </p>
      ) : (
        <KitsEstoqueBrowser empresas={empresas} />
      )}
    </main>
  );
}
