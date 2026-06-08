import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/app/_components/page-header";
import { SaidaBipe } from "@/app/saida/_components/saida-bipe";
import { Button } from "@/components/ui/button";

export default function SaidaPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <PageHeader
        eyebrow="Expedição"
        title="Saída"
        description="Bipe o QR de cada kit na saída: registra a expedição, o destino e recusa baixa dupla."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/producao">
              <ArrowLeft className="size-4" aria-hidden />
              Voltar
            </Link>
          </Button>
        }
      />
      <SaidaBipe />
    </main>
  );
}
