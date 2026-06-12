"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { tokenFromScan } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";

function revalidarSaida(saidaId?: string) {
  revalidatePath("/saida");
  if (saidaId) revalidatePath(`/saida/${saidaId}`);
  revalidatePath("/producao");
  revalidatePath("/dashboard");
}

// ── Abrir remessa de saída ───────────────────────────────────────────────────
const abrirSchema = z.object({
  empreendimentoId: z.string().uuid("Selecione um empreendimento."),
  destino: z.string().trim().max(120, "Destino muito longo.").optional(),
  observacao: z.string().trim().max(300, "Observação muito longa.").optional(),
});
export type AbrirSaidaInput = z.input<typeof abrirSchema>;
export type AbrirSaidaResult = { status: "ok"; saidaId: string } | { status: "error"; message: string };

export async function abrirSaida(input: AbrirSaidaInput): Promise<AbrirSaidaResult> {
  const parsed = abrirSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("abrir_saida", {
    p_empreendimento_id: parsed.data.empreendimentoId,
    p_destino: parsed.data.destino || undefined,
    p_observacao: parsed.data.observacao || undefined,
  });
  if (error || !data) {
    console.error("[saida] abrirSaida", error);
    return { status: "error", message: error?.message || "Não foi possível abrir a saída." };
  }
  revalidarSaida();
  return { status: "ok", saidaId: data.id };
}

// ── Bipar um kit dentro da remessa (em_estoque → expedido) ────────────────────
const biparSchema = z.object({
  saidaId: z.string().uuid(),
  qrCode: z.string().trim().min(1, "Bipe um QR."),
});
export type BiparSaidaResult =
  | { status: "ok"; numero: number; tipo: string }
  | { status: "error"; message: string };

export async function biparSaida(saidaId: string, qrCode: string): Promise<BiparSaidaResult> {
  const parsed = biparSchema.safeParse({ saidaId, qrCode });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "QR inválido." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bipar_saida", {
    p_saida_id: parsed.data.saidaId,
    p_qr_code: tokenFromScan(parsed.data.qrCode),
  });
  if (error || !data) {
    console.error("[saida] biparSaida", error);
    return { status: "error", message: error?.message || "Não foi possível registrar a saída." };
  }
  // Tipo do kit (pro feedback da linha) — a remessa pode ter tipos diferentes.
  const { data: lote } = await supabase
    .from("lote_resumo_view")
    .select("tipo_kit_nome")
    .eq("lote_id", data.lote_id)
    .maybeSingle();
  revalidarSaida(parsed.data.saidaId);
  return { status: "ok", numero: data.numero, tipo: lote?.tipo_kit_nome ?? "Kit" };
}

// ── Finalizar / cancelar remessa ──────────────────────────────────────────────
export type ActionResult = { status: "ok" | "error"; message?: string };

export async function finalizarSaida(saidaId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalizar_saida", { p_saida_id: saidaId });
  if (error) {
    console.error("[saida] finalizarSaida", error);
    return { status: "error", message: error.message || "Não foi possível finalizar a saída." };
  }
  revalidarSaida(saidaId);
  return { status: "ok" };
}

export async function cancelarSaida(saidaId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_saida", { p_saida_id: saidaId });
  if (error) {
    console.error("[saida] cancelarSaida", error);
    return { status: "error", message: error.message || "Não foi possível cancelar a saída." };
  }
  revalidarSaida(saidaId);
  return { status: "ok" };
}

// ── Prorrogar janela de recebimento (+48h; só gerente, banco revalida) ────────
export async function prorrogarRecebimento(saidaId: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(saidaId);
  if (!parsed.success) return { status: "error", message: "Saída inválida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("prorrogar_recebimento", { p_saida_id: parsed.data });
  if (error) {
    console.error("[saida] prorrogarRecebimento", error);
    return { status: "error", message: error.message || "Não foi possível prorrogar o recebimento." };
  }
  revalidarSaida(parsed.data);
  return { status: "ok" };
}
