import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/app/_components/page-header";
import { SaidaDetalhe } from "@/app/saida/[id]/_components/saida-detalhe";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SaidaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [saidaRes, kitsRes] = await Promise.all([
    supabase.from("saida_resumo_view").select("*").eq("saida_id", id).maybeSingle(),
    supabase.from("unidade_kit").select("numero").eq("saida_id", id).order("numero", { ascending: false }),
  ]);

  const saida = saidaRes.data;
  if (!saida) notFound();
  const kits = (kitsRes.data ?? []).map((k) => ({ numero: k.numero }));

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <PageHeader
        eyebrow="Expedição · remessa"
        title={saida.empreendimento_nome ?? "Saída"}
        description={
          saida.destino
            ? `Destino: ${saida.destino}`
            : "Bipe o QR de cada kit para expedir nesta remessa."
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/saida">
              <ArrowLeft className="size-4" aria-hidden />
              Voltar
            </Link>
          </Button>
        }
      />
      <SaidaDetalhe
        saidaId={id}
        status={saida.status ?? "aberta"}
        observacao={saida.observacao}
        kitsIniciais={kits}
      />
    </main>
  );
}
