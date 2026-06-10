"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

function revalidarTransferencia(loteId?: string | null) {
  revalidatePath("/producao");
  if (loteId) revalidatePath(`/producao/${loteId}`);
  revalidatePath("/producao/estoque");
  revalidatePath("/insumos");
  revalidatePath("/dashboard");
}

// ── Origens candidatas: SPEs do MESMO tenant com disponível > 0 do insumo ────
export type OrigemDisponivel = {
  empreendimentoId: string;
  empreendimentoNome: string;
  disponivel: number;
};
export type ListarOrigensResult =
  | { status: "ok"; origens: OrigemDisponivel[] }
  | { status: "error"; message: string };

export async function listarOrigensDisponiveis(
  insumoId: string,
  destinoId: string,
): Promise<ListarOrigensResult> {
  const supabase = await createClient();

  const { data: destino, error: destinoError } = await supabase
    .from("empreendimento")
    .select("tenant_id")
    .eq("id", destinoId)
    .maybeSingle();
  const tenantId = destino?.tenant_id;
  if (destinoError || !tenantId) {
    console.error("[transferencia] listarOrigensDisponiveis destino", destinoError);
    return { status: "error", message: "Empreendimento de destino não encontrado." };
  }

  const [saldosRes, empsRes] = await Promise.all([
    supabase
      .from("saldo_insumo_disponivel")
      .select("empreendimento_id, disponivel")
      .eq("insumo_id", insumoId)
      .eq("tenant_id", tenantId)
      .neq("empreendimento_id", destinoId)
      .gt("disponivel", 0),
    supabase
      .from("empreendimento")
      .select("id, nome")
      .eq("tenant_id", tenantId),
  ]);
  if (saldosRes.error || empsRes.error) {
    console.error("[transferencia] listarOrigensDisponiveis", saldosRes.error ?? empsRes.error);
    return { status: "error", message: "Não foi possível buscar o estoque das outras SPEs." };
  }

  const nomePorId = new Map((empsRes.data ?? []).map((e) => [e.id, e.nome]));
  const origens = (saldosRes.data ?? [])
    .filter((s) => s.empreendimento_id && s.disponivel != null)
    .map((s) => ({
      empreendimentoId: s.empreendimento_id as string,
      empreendimentoNome: nomePorId.get(s.empreendimento_id as string) ?? "SPE",
      disponivel: Number(s.disponivel),
    }))
    .sort((a, b) => b.disponivel - a.disponivel);

  return { status: "ok", origens };
}

// ── Transferir insumo entre SPEs (registrado + pendência de reposição) ───────
const transferirSchema = z.object({
  insumoId: z.string().uuid("Selecione o insumo."),
  origemId: z.string().uuid("Selecione a SPE de origem."),
  destinoId: z.string().uuid("Destino inválido."),
  quantidade: z.coerce.number().positive("Quantidade deve ser maior que zero."),
  motivo: z.string().trim().max(500).optional(),
  loteId: z.string().uuid().nullable().optional(),
});
export type TransferirInsumoInput = z.input<typeof transferirSchema>;
export type TransferirInsumoResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function transferirInsumo(
  input: TransferirInsumoInput,
): Promise<TransferirInsumoResult> {
  const parsed = transferirSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("transferir_insumo", {
    p_insumo_id: parsed.data.insumoId,
    p_origem_id: parsed.data.origemId,
    p_destino_id: parsed.data.destinoId,
    p_quantidade: parsed.data.quantidade,
    p_motivo: parsed.data.motivo || undefined,
    p_lote_id: parsed.data.loteId ?? undefined,
  });
  if (error) {
    console.error("[transferencia] transferirInsumo", error);
    return { status: "error", message: error.message || "Não foi possível transferir o insumo." };
  }
  revalidarTransferencia(parsed.data.loteId);
  return { status: "ok" };
}

// ── Fechar pendência de reposição ────────────────────────────────────────────
export async function marcarReposta(transferenciaId: string): Promise<TransferirInsumoResult> {
  const parsed = z.string().uuid().safeParse(transferenciaId);
  if (!parsed.success) return { status: "error", message: "Transferência inválida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("marcar_reposta", { p_transferencia_id: parsed.data });
  if (error) {
    console.error("[transferencia] marcarReposta", error);
    return { status: "error", message: error.message || "Não foi possível marcar como reposta." };
  }
  revalidarTransferencia();
  return { status: "ok" };
}
