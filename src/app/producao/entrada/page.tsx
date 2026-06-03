import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/app/_components/page-header";
import { EntradaBipe } from "@/app/producao/entrada/_components/entrada-bipe";
import { Button } from "@/components/ui/button";

export default function EntradaDepositoPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <PageHeader
        eyebrow="Produção · depósito"
        title="Entrada no depósito"
        description="Bipe o QR de cada kit etiquetado para dar entrada no estoque de kits prontos."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/producao">
              <ArrowLeft className="size-4" aria-hidden />
              Voltar
            </Link>
          </Button>
        }
      />
      <EntradaBipe />
    </main>
  );
}
