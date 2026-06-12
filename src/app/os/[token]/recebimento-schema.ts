import { z } from "zod";

// Contratos jsonb das RPCs públicas do recebimento (discriminados por
// `resultado`). A RPC é a fronteira de confiança; o zod aqui só estreita o
// Json para a UI sem `any`.

export const osPublicaSchema = z.object({
  resultado: z.literal("ok"),
  os: z.object({
    numero: z.number(),
    status: z.string(),
    destino: z.string().nullable(),
    empreendimento_nome: z.string().nullable(),
    finalizado_em: z.string().nullable(),
    recebimento_expira_em: z.string().nullable(),
    janela_ativa: z.boolean(),
    recebido_em: z.string().nullable(),
    recebedor_nome: z.string().nullable(),
    recebedor_cpf_mascarado: z.string().nullable(),
    recusa_motivo: z.string().nullable(),
  }),
  kits: z.array(
    z.object({
      numero: z.number(),
      tipo_kit_nome: z.string().nullable(),
      status: z.string(),
      entregue_em: z.string().nullable(),
    }),
  ),
  estranhos: z.array(
    z.object({
      qr_code: z.string(),
      motivo: z.string(),
      bipado_em: z.string(),
    }),
  ),
});
export type OsPublica = z.infer<typeof osPublicaSchema>;
export type KitPublico = OsPublica["kits"][number];
export type BipeEstranho = OsPublica["estranhos"][number];

export const consultaSchema = z.union([
  osPublicaSchema,
  z.object({ resultado: z.literal("nao_encontrada") }),
]);

export const bipeResultadoSchema = z.discriminatedUnion("resultado", [
  z.object({
    resultado: z.literal("entregue"),
    numero: z.number(),
    tipo_kit_nome: z.string(),
    entregues: z.number(),
    total: z.number(),
  }),
  z.object({ resultado: z.literal("duplicado"), numero: z.number(), mensagem: z.string() }),
  z.object({ resultado: z.literal("estranho"), motivo: z.string(), mensagem: z.string() }),
  z.object({ resultado: z.literal("encerrada"), mensagem: z.string() }),
  z.object({ resultado: z.literal("nao_encontrada") }),
  z.object({ resultado: z.literal("erro"), mensagem: z.string() }),
]);
export type BipeResultado = z.infer<typeof bipeResultadoSchema>;

export const confirmacaoResultadoSchema = z.discriminatedUnion("resultado", [
  z.object({ resultado: z.literal("confirmada"), status: z.string() }),
  z.object({ resultado: z.literal("encerrada"), mensagem: z.string() }),
  z.object({ resultado: z.literal("nao_encontrada") }),
  z.object({ resultado: z.literal("erro"), mensagem: z.string() }),
]);
export type ConfirmacaoResultado = z.infer<typeof confirmacaoResultadoSchema>;

export const ACOES_CONFIRMACAO = ["receber", "receber_divergencia", "recusar"] as const;
export type AcaoConfirmacao = (typeof ACOES_CONFIRMACAO)[number];
