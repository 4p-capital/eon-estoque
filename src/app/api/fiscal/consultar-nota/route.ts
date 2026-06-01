import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { decifrar, decifrarTexto } from "@/lib/fiscal/cripto";
import { consultarPorChave } from "@/lib/fiscal/sefaz";
import { parseChave } from "@/lib/fiscal/chave";
import { parseProcNFe } from "@/lib/fiscal/nfe-parser";
import { prepararNota, carregarNota } from "@/lib/fiscal/nota-repo";

// mTLS com o A1 exige runtime Node (não Edge).
export const runtime = "nodejs";

type Tentativa = { spe: string; cStat: string | null; xMotivo: string | null; erro?: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { chave?: string } | null;
  const info = parseChave(body?.chave ?? "");
  if (!info) {
    return NextResponse.json({ ok: false, message: "Chave de acesso inválida (esperado 44 dígitos)." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: spes, error } = await supabase
    .from("spe")
    .select("id, razao_social, cnpj, uf, empreendimento_id, certificado_cifrado, senha_cifrada")
    .eq("ativo", true);

  if (error) {
    console.error("[fiscal] consultar-nota: carregar SPEs", error);
    return NextResponse.json({ ok: false, message: "Falha ao carregar os certificados." }, { status: 500 });
  }
  if (!spes || spes.length === 0) {
    return NextResponse.json({ ok: false, message: "Nenhum certificado de SPE cadastrado." }, { status: 412 });
  }

  const tentativas: Tentativa[] = [];

  // Sem o destinatário na chave, tenta cada SPE até uma retornar o documento
  // (só o destinatário/parte da nota recebe o XML da SEFAZ).
  for (const spe of spes) {
    if (!spe.uf) {
      tentativas.push({ spe: spe.razao_social, cStat: null, xMotivo: "SPE sem UF cadastrada." });
      continue;
    }
    try {
      const resposta = await consultarPorChave({
        pfx: decifrar(spe.certificado_cifrado),
        senha: decifrarTexto(spe.senha_cifrada),
        cnpj: spe.cnpj,
        uf: spe.uf,
        chave: info.chave,
      });

      tentativas.push({ spe: spe.razao_social, cStat: resposta.cStat, xMotivo: resposta.xMotivo });

      const docProc = resposta.documentos.find((d) => /procNFe/i.test(d.schema));
      if (!docProc) {
        continue; // essa SPE não é parte da nota / sem XML completo
      }

      const parsed = parseProcNFe(docProc.xml);
      if (!parsed) {
        return NextResponse.json({ ok: false, message: "XML retornado não pôde ser interpretado." }, { status: 502 });
      }

      const notaId = await prepararNota(supabase, spe, parsed, docProc.xml);
      const conferencia = await carregarNota(supabase, notaId, spe.razao_social);
      if (!conferencia) {
        return NextResponse.json({ ok: false, message: "Falha ao carregar a nota salva." }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        encontrado: true,
        spe: { id: spe.id, razao_social: spe.razao_social, cnpj: spe.cnpj },
        nota: conferencia.nota,
        itens: conferencia.itens,
        xml: docProc.xml,
      });
    } catch (err) {
      console.error("[fiscal] consultar-nota: SEFAZ", spe.razao_social, err);
      tentativas.push({
        spe: spe.razao_social,
        cStat: null,
        xMotivo: null,
        erro: err instanceof Error ? err.message : "erro desconhecido",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    encontrado: false,
    chave: info.chave,
    emitenteCnpj: info.cnpjEmitente,
    message: "Nenhuma SPE cadastrada é parte desta nota (ou a SEFAZ não liberou o XML).",
    tentativas,
  });
}
