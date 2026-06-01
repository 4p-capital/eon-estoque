"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { lerCertificado } from "@/lib/fiscal/certificado";
import { cifrar, cifrarTexto } from "@/lib/fiscal/cripto";
import { isCodigoUf } from "@/lib/fiscal/uf";

export type FormState = { status: "idle" | "ok" | "error"; message?: string };

// A1 .pfx é pequeno (~3-8KB). 64KB é folga de sobra e barra upload errado.
const MAX_PFX_BYTES = 64 * 1024;

const cadastroSchema = z.object({
  senha: z.string().min(1, "Informe a senha do certificado."),
  uf: z.string().refine(isCodigoUf, "Selecione a UF da SPE."),
  empreendimento_id: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export async function cadastrarSpe(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const arquivo = formData.get("certificado");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { status: "error", message: "Anexe o arquivo .pfx do certificado." };
  }
  if (arquivo.size > MAX_PFX_BYTES) {
    return { status: "error", message: "Arquivo grande demais para um certificado .pfx." };
  }

  const parsed = cadastroSchema.safeParse({
    senha: formData.get("senha"),
    uf: formData.get("uf") ?? "",
    empreendimento_id: formData.get("empreendimento_id") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const pfx = Buffer.from(await arquivo.arrayBuffer());

  // Ler o cert valida a senha (pkcs12FromAsn1 falha se estiver errada) e extrai metadados.
  let dados: ReturnType<typeof lerCertificado>;
  try {
    dados = lerCertificado(pfx, parsed.data.senha);
  } catch (err) {
    console.error("[fiscal] lerCertificado", err);
    return {
      status: "error",
      message: "Não consegui abrir o certificado. Confira se a senha está correta e se o arquivo é um .pfx válido.",
    };
  }

  let certificadoCifrado: string;
  let senhaCifrada: string;
  try {
    certificadoCifrado = cifrar(pfx);
    senhaCifrada = cifrarTexto(parsed.data.senha);
  } catch (err) {
    console.error("[fiscal] cifrar", err);
    return { status: "error", message: "Falha ao cifrar o certificado no servidor (chave-mestra ausente?)." };
  }

  const supabase = await createClient();

  // Bloqueia duplicado antes de criar empreendimento (evita órfão).
  const { data: existente } = await supabase.from("spe").select("id").eq("cnpj", dados.cnpj).maybeSingle();
  if (existente) {
    return { status: "error", message: `Já existe uma SPE com o CNPJ ${dados.cnpj}.` };
  }

  // Empreendimento: usa o informado ou cria um a partir da razão social do cert.
  let empreendimentoId = parsed.data.empreendimento_id ?? null;
  if (!empreendimentoId) {
    const { data: empreendimento, error: erroEmp } = await supabase
      .from("empreendimento")
      .insert({ nome: dados.razaoSocial })
      .select("id")
      .single();
    if (erroEmp || !empreendimento) {
      console.error("[fiscal] cadastrarSpe criar empreendimento", erroEmp);
      return { status: "error", message: "Não foi possível criar o empreendimento da SPE." };
    }
    empreendimentoId = empreendimento.id;
  }

  const { error } = await supabase.from("spe").insert({
    cnpj: dados.cnpj,
    razao_social: dados.razaoSocial,
    uf: parsed.data.uf,
    empreendimento_id: empreendimentoId,
    certificado_cifrado: certificadoCifrado,
    senha_cifrada: senhaCifrada,
    certificado_validade: dados.validade,
  });

  if (error) {
    console.error("[fiscal] cadastrarSpe insert", error);
    if (error.code === "23505") {
      return { status: "error", message: `Já existe uma SPE com o CNPJ ${dados.cnpj}.` };
    }
    return { status: "error", message: "Não foi possível salvar o certificado." };
  }

  revalidatePath("/fiscal");
  return { status: "ok", message: `Certificado de ${dados.razaoSocial} cadastrado.` };
}

export async function excluirSpe(id: string): Promise<FormState> {
  const valido = z.string().uuid().safeParse(id);
  if (!valido.success) {
    return { status: "error", message: "Registro inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("spe").delete().eq("id", valido.data);
  if (error) {
    console.error("[fiscal] excluirSpe", error);
    return { status: "error", message: "Não foi possível remover o certificado." };
  }

  revalidatePath("/fiscal");
  return { status: "ok", message: "Certificado removido." };
}
