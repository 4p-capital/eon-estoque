import { createClient } from "@/lib/supabase/server";
import { cardCls } from "@/app/_components/form-styles";
import { PageHeader } from "@/app/_components/page-header";
import { NovoCertificadoForm } from "@/app/fiscal/_components/novo-certificado-form";
import { SpeList, type SpeRow } from "@/app/fiscal/_components/spe-list";

export const dynamic = "force-dynamic";

export default async function FiscalPage() {
  const supabase = await createClient();

  // Nunca selecionar as colunas cifradas (certificado_cifrado/senha_cifrada) aqui:
  // elas só são lidas no servidor, na hora de falar com a SEFAZ.
  const [{ data: spes, error }, { data: empreendimentos }] = await Promise.all([
    supabase
      .from("spe")
      .select("id, cnpj, razao_social, certificado_validade, ativo, empreendimento_id")
      .order("razao_social"),
    supabase.from("empreendimento").select("id, nome").order("nome"),
  ]);

  const nomePorEmpreendimento = new Map((empreendimentos ?? []).map((e) => [e.id, e.nome]));
  const rows: SpeRow[] = (spes ?? []).map((s) => ({
    id: s.id,
    cnpj: s.cnpj,
    razao_social: s.razao_social,
    certificado_validade: s.certificado_validade,
    ativo: s.ativo,
    empreendimento_nome: s.empreendimento_id
      ? (nomePorEmpreendimento.get(s.empreendimento_id) ?? null)
      : null,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Certificados"
        title="Certificados fiscais"
        description="Certificados A1 das SPEs, usados para consultar as notas direto na SEFAZ. O .pfx e a senha ficam cifrados e nunca saem do servidor."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <section className={cardCls}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Novo certificado
          </h2>
          <NovoCertificadoForm empreendimentos={empreendimentos ?? []} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cadastrados
          </h2>
          {error ? (
            <p className="rounded-lg border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
              Não foi possível carregar os certificados. {error.message}
            </p>
          ) : (
            <SpeList rows={rows} hoje={new Date()} />
          )}
        </section>
      </div>
    </main>
  );
}
