"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// O QR codifica a URL /k/<token>; o scanner pode "digitar" a URL inteira.
// Extrai o token (último segmento de /k/) ou usa o valor cru.
function tokenFromScan(v: string): string {
  const t = v.trim();
  const m = t.match(/\/k\/([^/?#\s]+)/);
  return m ? decodeURIComponent(m[1]) : t;
}

const schema = z.object({
  qrCode: z.string().trim().min(1, "Bipe um QR."),
  destino: z.string().trim().max(120, "Destino muito longo.").optional(),
});

export type RegistrarSaidaResult =
  | { status: "ok"; numero: number }
  | { status: "error"; message: string };

// Bipe de saída: registra a expedição do kit (em_estoque → expedido), grava a
// movimentação de saída com o destino e recusa baixa dupla (regra na RPC).
export async function registrarSaida(
  qrCode: string,
  destino?: string,
): Promise<RegistrarSaidaResult> {
  const parsed = schema.safeParse({ qrCode, destino });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "QR inválido." };
  }

  const obs = parsed.data.destino && parsed.data.destino.length > 0 ? parsed.data.destino : undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_saida_kit", {
    p_qr_code: tokenFromScan(parsed.data.qrCode),
    p_observacao: obs,
  });
  if (error || !data) {
    console.error("[saida] registrarSaida", error);
    return { status: "error", message: error?.message || "Não foi possível registrar a saída." };
  }

  revalidatePath("/saida");
  revalidatePath("/producao");
  revalidatePath("/dashboard");
  return { status: "ok", numero: (data as { numero: number }).numero };
}
