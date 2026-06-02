import { PageHeader } from "@/app/_components/page-header";
import { CadastroInsumos } from "@/app/insumos/cadastro/_components/cadastro-insumos";

export const dynamic = "force-dynamic";

export default function CadastroInsumosPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Insumos"
        title="Cadastro"
        description="Catálogo completo de insumos. Cadastre novos itens — o saldo aparece em Estoque após a entrada."
      />

      <CadastroInsumos />
    </main>
  );
}
