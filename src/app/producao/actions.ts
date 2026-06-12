"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { tokenFromScan } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { status: "ok" | "error"; message?: string };
export type UnidadeProduzida = { numero: number; qr_code: string };

function revalidarProducao(loteId?: string) {
  revalidatePath("/producao");
  if (loteId) revalidatePath(`/producao/${loteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/insumos");
}

// ── Abrir lote vivo ──────────────────────────────────────────────────────────
const abrirSchema = z.object({
  tipoKitId: z.string().uuid("Selecione um tipo de kit."),
  empreendimentoId: z.string().uuid("Selecione um empreendimento."),
  meta: z.number().int().positive("Meta deve ser maior que zero.").nullable().optional(),
});
export type AbrirLoteInput = z.input<typeof abrirSchema>;
export type AbrirLoteResult = { status: "ok"; loteId: string } | { status: "error"; message: string };

export async function abrirLote(input: AbrirLoteInput): Promise<AbrirLoteResult> {
  const parsed = abrirSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("abrir_lote", {
    p_tipo_kit_id: parsed.data.tipoKitId,
    p_empreendimento_id: parsed.data.empreendimentoId,
    p_meta: parsed.data.meta ?? undefined,
  });
  if (error || !data) {
    console.error("[producao] abrirLote", error);
    return { status: "error", message: error?.message || "Não foi possível abrir o lote." };
  }
  revalidarProducao();
  return { status: "ok", loteId: (data as { id: string }).id };
}

// ── Gerar/imprimir etiquetas (cria unidades pendentes; SEM baixa de BOM) ──────
const gerarSchema = z.object({
  loteId: z.string().uuid(),
  quantidade: z.coerce.number().int().positive("Quantidade deve ser maior que zero."),
});
export type GerarEtiquetasInput = z.input<typeof gerarSchema>;
export type GerarResult =
  | { status: "ok"; unidades: UnidadeProduzida[] }
  | { status: "error"; message: string };

export async function gerarEtiquetas(input: GerarEtiquetasInput): Promise<GerarResult> {
  const parsed = gerarSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("gerar_etiquetas", {
    p_lote_id: parsed.data.loteId,
    p_quantidade: parsed.data.quantidade,
  });
  if (error || !data) {
    console.error("[producao] gerarEtiquetas", error);
    return { status: "error", message: error?.message || "Não foi possível gerar as etiquetas." };
  }
  const unidades = (data as { numero: number; qr_code: string }[])
    .map((u) => ({ numero: u.numero, qr_code: u.qr_code }))
    .sort((a, b) => a.numero - b.numero);
  revalidarProducao(parsed.data.loteId);
  return { status: "ok", unidades };
}

// ── Finalizar / cancelar lote ────────────────────────────────────────────────
export async function finalizarLote(loteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalizar_lote", { p_lote_id: loteId });
  if (error) {
    console.error("[producao] finalizarLote", error);
    return { status: "error", message: error.message || "Não foi possível finalizar o lote." };
  }
  revalidarProducao(loteId);
  return { status: "ok" };
}

export async function cancelarLote(loteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_lote", { p_lote_id: loteId });
  if (error) {
    console.error("[producao] cancelarLote", error);
    return { status: "error", message: error.message || "Não foi possível cancelar o lote." };
  }
  revalidarProducao(loteId);
  return { status: "ok" };
}

// ── Cancelar etiquetas pendentes (sobra/erro de impressão; só gerente) ────────
// O enforcement real é na RPC (papel galpao_admin via JWT); aqui só validação
// de input. Cancela as N pendentes mais recentes e libera a reserva de BOM.
const cancelarEtiquetasSchema = z.object({
  loteId: z.string().uuid(),
  quantidade: z.coerce.number().int().positive("Quantidade deve ser maior que zero."),
  motivo: z.string().trim().min(1, "Informe o motivo do cancelamento.").max(500),
});
export type CancelarEtiquetasInput = z.input<typeof cancelarEtiquetasSchema>;

export async function cancelarEtiquetas(input: CancelarEtiquetasInput): Promise<ActionResult> {
  const parsed = cancelarEtiquetasSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_etiquetas_pendentes", {
    p_lote_id: parsed.data.loteId,
    p_quantidade: parsed.data.quantidade,
    p_motivo: parsed.data.motivo,
  });
  if (error) {
    console.error("[producao] cancelarEtiquetas", error);
    return {
      status: "error",
      message: error.message || "Não foi possível cancelar as etiquetas.",
    };
  }
  revalidarProducao(parsed.data.loteId);
  return { status: "ok" };
}

// ── Bipe de entrada no depósito (pendente → em_estoque, baixa BOM de 1 kit) ───
const entradaSchema = z.object({ qrCode: z.string().trim().min(1, "Bipe um QR.") });
export type RegistrarEntradaResult =
  | { status: "ok"; numero: number }
  | { status: "error"; message: string };

export async function registrarEntrada(qrCode: string): Promise<RegistrarEntradaResult> {
  const parsed = entradaSchema.safeParse({ qrCode });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "QR inválido." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_entrada_kit", {
    p_qr_code: tokenFromScan(parsed.data.qrCode),
  });
  if (error || !data) {
    console.error("[producao] registrarEntrada", error);
    return { status: "error", message: error?.message || "Não foi possível registrar a entrada." };
  }
  revalidarProducao((data as { lote_id: string }).lote_id);
  return { status: "ok", numero: (data as { numero: number }).numero };
}

// ── Consulta INTERNA (logada): info completa + histórico de movimentação ──────
export type KitMovimento = {
  tipo: string;
  quantidade: number;
  data: string | null;
  observacao: string | null;
};
export type KitConsulta = {
  numero: number;
  status: string;
  tipoKit: string;
  empreendimento: string | null;
  loteId: string;
  loteStatus: string | null;
  fabricadoEm: string | null;
  entradaEm: string | null;
  dataProducao: string | null;
  saida: {
    destino: string | null;
    status: string | null;
    empreendimentoNome: string | null;
    data: string | null;
  } | null;
  movimentos: KitMovimento[];
};
export type ConsultarKitResult =
  | { status: "ok"; kit: KitConsulta }
  | { status: "error"; message: string };

export async function consultarKit(qrCode: string): Promise<ConsultarKitResult> {
  const token = tokenFromScan((qrCode ?? "").trim());
  if (!token) return { status: "error", message: "Bipe um QR." };

  const supabase = await createClient();
  const { data: unidade, error } = await supabase
    .from("unidade_kit")
    .select("id, numero, status, impressa_em, entrada_em, lote_id, saida_id")
    .eq("qr_code", token)
    .maybeSingle();
  if (error) {
    console.error("[producao] consultarKit", error);
    return { status: "error", message: "Falha ao consultar o kit." };
  }
  if (!unidade) return { status: "error", message: "QR não encontrado." };

  const { data: lote } = await supabase
    .from("lote_resumo_view")
    .select("tipo_kit_nome, empreendimento_nome, status, data_producao")
    .eq("lote_id", unidade.lote_id)
    .maybeSingle();

  const { data: movs } = await supabase
    .from("movimentacao")
    .select("tipo, quantidade, data, observacao")
    .eq("unidade_kit_id", unidade.id)
    .order("data", { ascending: true });

  // Expedição: se o kit já entrou numa remessa, traz os dados da saída.
  let saida: KitConsulta["saida"] = null;
  if (unidade.saida_id) {
    const { data: s } = await supabase
      .from("saida_resumo_view")
      .select("destino, status, empreendimento_nome, created_at")
      .eq("saida_id", unidade.saida_id)
      .maybeSingle();
    if (s) {
      saida = {
        destino: s.destino,
        status: s.status,
        empreendimentoNome: s.empreendimento_nome,
        data: s.created_at,
      };
    }
  }

  return {
    status: "ok",
    kit: {
      numero: unidade.numero,
      status: unidade.status,
      tipoKit: lote?.tipo_kit_nome ?? "Kit",
      empreendimento: lote?.empreendimento_nome ?? null,
      loteId: unidade.lote_id,
      loteStatus: lote?.status ?? null,
      fabricadoEm: unidade.impressa_em,
      entradaEm: unidade.entrada_em,
      dataProducao: lote?.data_producao ?? null,
      saida,
      movimentos: (movs ?? []).map((m) => ({
        tipo: m.tipo,
        quantidade: Number(m.quantidade),
        data: m.data,
        observacao: m.observacao,
      })),
    },
  };
}
