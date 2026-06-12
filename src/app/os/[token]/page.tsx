import { Boxes, PackageSearch } from "lucide-react";

import { RecebimentoOs } from "@/app/os/[token]/_components/recebimento-os";
import { consultaSchema } from "@/app/os/[token]/recebimento-schema";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Página PÚBLICA do recebimento da OS na obra (sem login — o token da URL é a
// credencial; quem tem o link impresso que viajou com o caminhão recebe ESTA
// OS). Espelha o padrão de /k/<token>: client anon + RPC security definer.
export default async function RecebimentoPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consultar_recebimento_publico", {
    p_token: token,
  });
  if (error) console.error("[os] consultar_recebimento_publico", error);

  const parsed = consultaSchema.safeParse(data);
  const payload = parsed.success ? parsed.data : { resultado: "nao_encontrada" as const };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-foreground">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <Boxes className="size-5" aria-hidden />
          </span>
          <span className="font-heading text-lg">
            <span className="font-extrabold">EON</span> Produções
          </span>
        </div>

        {payload.resultado === "ok" ? (
          <RecebimentoOs token={token} inicial={payload} />
        ) : (
          <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
            <PackageSearch className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium text-foreground">OS não encontrada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              O link aberto não corresponde a nenhuma ordem de expedição. Confira o QR impresso
              ou procure o galpão EON.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Recebimento de expedição · EON Instalações
        </p>
      </div>
    </main>
  );
}
