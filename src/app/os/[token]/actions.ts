"use server";

import { z } from "zod";

import { cpfValido } from "@/lib/cpf";
import { tokenFromScan } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import {
  ACOES_CONFIRMACAO,
  bipeResultadoSchema,
  confirmacaoResultadoSchema,
  type BipeResultado,
  type ConfirmacaoResultado,
} from "./recebimento-schema";

// Actions da página PÚBLICA da OS: rodam sem sessão (role anon). Toda regra de
// negócio vive nas RPCs security definer — aqui é só validação de formato e
// narrowing do jsonb retornado.

const ERRO_GENERICO = { resultado: "erro", mensagem: "Algo deu errado. Tente novamente." } as const;

export async function biparRecebimento(token: string, qrRaw: string): Promise<BipeResultado> {
  const input = z
    .object({ token: z.string().trim().min(1), qr: z.string().trim().min(1) })
    .safeParse({ token, qr: qrRaw });
  if (!input.success) return { resultado: "erro", mensagem: "Bipe ou digite um código." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bipar_recebimento", {
    p_token: input.data.token,
    p_qr_code: tokenFromScan(input.data.qr),
  });
  if (error) {
    console.error("[os] biparRecebimento", error);
    return ERRO_GENERICO;
  }
  const parsed = bipeResultadoSchema.safeParse(data);
  if (!parsed.success) {
    console.error("[os] biparRecebimento payload inesperado", parsed.error);
    return ERRO_GENERICO;
  }
  return parsed.data;
}

const confirmarSchema = z
  .object({
    token: z.string().trim().min(1),
    acao: z.enum(ACOES_CONFIRMACAO),
    nome: z.string().trim().min(5, "Informe o nome completo de quem está recebendo."),
    cpf: z.string().refine(cpfValido, "CPF inválido — confira os dígitos."),
    motivo: z.string().trim().max(300, "Motivo muito longo.").optional(),
  })
  .superRefine((v, ctx) => {
    if (v.acao === "recusar" && !v.motivo) {
      ctx.addIssue({ code: "custom", path: ["motivo"], message: "Informe o motivo da recusa." });
    }
  });
export type ConfirmarRecebimentoInput = z.input<typeof confirmarSchema>;

export async function confirmarRecebimento(
  input: ConfirmarRecebimentoInput,
): Promise<ConfirmacaoResultado> {
  const parsed = confirmarSchema.safeParse(input);
  if (!parsed.success) {
    return {
      resultado: "erro",
      mensagem: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirmar_recebimento", {
    p_token: parsed.data.token,
    p_acao: parsed.data.acao,
    p_nome: parsed.data.nome,
    p_cpf: parsed.data.cpf,
    p_motivo: parsed.data.motivo || undefined,
  });
  if (error) {
    console.error("[os] confirmarRecebimento", error);
    return ERRO_GENERICO;
  }
  const resultado = confirmacaoResultadoSchema.safeParse(data);
  if (!resultado.success) {
    console.error("[os] confirmarRecebimento payload inesperado", resultado.error);
    return ERRO_GENERICO;
  }
  return resultado.data;
}
