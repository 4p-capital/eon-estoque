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

// ── Origens candidatas: SPEs do MESMO tenant com saldo do insumo ─────────────
// Inclui as de disponível ≤ 0 (saldo todo reservado por etiquetas pendentes):
// a UI explica o bloqueio em vez de sumir com uma SPE que mostra saldo em
// /insumos — sumir lia-se como "a regra de mesmo cliente barrou".
export type ReservaPendente = {
  tipoKitNome: string;
  statusLote: string;
  qtdPendentes: number;
  consumo: number;
};
export type OrigemTransferencia = {
  empreendimentoId: string;
  empreendimentoNome: string;
  saldo: number;
  reservado: number;
  disponivel: number;
  reservas: ReservaPendente[];
};
export type ListarOrigensResult =
  | { status: "ok"; origens: OrigemTransferencia[]; tenantNome: string | null }
  | { status: "error"; message: string };

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Detalha QUEM segura a reserva de cada SPE: lotes com etiquetas pendentes
// cujo BOM consome o insumo. Alimenta a explicação do drawer ("3 etiquetas de
// KIT TESTE seguram 6") em vez de um "reservado" opaco.
async function buscarReservasPendentes(
  supabase: ServerClient,
  insumoId: string,
  empreendimentoIds: string[],
): Promise<Map<string, ReservaPendente[]>> {
  const reservas = new Map<string, ReservaPendente[]>();
  if (empreendimentoIds.length === 0) return reservas;

  const { data: lotes, error: lotesError } = await supabase
    .from("lote_resumo_view")
    .select("tipo_kit_id, tipo_kit_nome, empreendimento_id, status, qtd_pendentes")
    .in("empreendimento_id", empreendimentoIds)
    .gt("qtd_pendentes", 0);
  if (lotesError || !lotes?.length) {
    if (lotesError) console.error("[transferencia] buscarReservasPendentes lotes", lotesError);
    return reservas;
  }

  const tipoKitIds = [...new Set(lotes.map((l) => l.tipo_kit_id).filter(Boolean))] as string[];
  const { data: comps, error: compsError } = await supabase
    .from("composicao")
    .select("tipo_kit_id, quantidade")
    .eq("insumo_id", insumoId)
    .in("tipo_kit_id", tipoKitIds);
  if (compsError) {
    console.error("[transferencia] buscarReservasPendentes composicao", compsError);
    return reservas;
  }
  const qtdPorKit = new Map((comps ?? []).map((c) => [c.tipo_kit_id, Number(c.quantidade)]));

  for (const l of lotes) {
    const porKit = qtdPorKit.get(l.tipo_kit_id ?? "");
    if (!porKit || !l.empreendimento_id) continue;
    const lista = reservas.get(l.empreendimento_id) ?? [];
    lista.push({
      tipoKitNome: l.tipo_kit_nome ?? "kit",
      statusLote: l.status ?? "aberto",
      qtdPendentes: Number(l.qtd_pendentes ?? 0),
      consumo: Number(l.qtd_pendentes ?? 0) * porKit,
    });
    reservas.set(l.empreendimento_id, lista);
  }
  return reservas;
}

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

  const { data: tenant } = await supabase
    .from("tenant")
    .select("nome")
    .eq("id", tenantId)
    .maybeSingle();

  const [saldosRes, empsRes] = await Promise.all([
    supabase
      .from("saldo_insumo_disponivel")
      .select("empreendimento_id, saldo, reservado, disponivel")
      .eq("insumo_id", insumoId)
      .eq("tenant_id", tenantId)
      .neq("empreendimento_id", destinoId)
      .gt("saldo", 0),
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
  const parciais = (saldosRes.data ?? [])
    .filter((s) => s.empreendimento_id != null)
    .map((s) => ({
      empreendimentoId: s.empreendimento_id as string,
      empreendimentoNome: nomePorId.get(s.empreendimento_id as string) ?? "SPE",
      saldo: Number(s.saldo ?? 0),
      reservado: Number(s.reservado ?? 0),
      disponivel: Number(s.disponivel ?? 0),
    }))
    .sort((a, b) => b.disponivel - a.disponivel);

  const reservasPorSpe = await buscarReservasPendentes(
    supabase,
    insumoId,
    parciais.filter((o) => o.reservado > 0).map((o) => o.empreendimentoId),
  );
  const origens = parciais.map((o) => ({
    ...o,
    reservas: reservasPorSpe.get(o.empreendimentoId) ?? [],
  }));

  return { status: "ok", origens, tenantNome: tenant?.nome ?? null };
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
