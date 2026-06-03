import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/app/_components/page-header";
import { ConsultarKit } from "@/app/producao/consultar/_components/consultar-kit";
import { Button } from "@/components/ui/button";

export default function ConsultarKitPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <PageHeader
        eyebrow="Produção · consulta"
        title="Consultar kit"
        description="Bipe o QR de um kit para ver tipo, empreendimento, lote, datas e o histórico de movimentações."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/producao">
              <ArrowLeft className="size-4" aria-hidden />
              Voltar
            </Link>
          </Button>
        }
      />
      <ConsultarKit />
    </main>
  );
}
