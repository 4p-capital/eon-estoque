// Cliente do web service NFeDistribuiçãoDFe (Ambiente Nacional) com TLS mútuo
// pelo certificado A1. USO EXCLUSIVO NO SERVIDOR (Route Handler runtime=nodejs).
//
// Por ora expõe consChNFe (consulta por chave) — o que o fluxo de Entrada usa
// ao bipar o barcode. distNSU (sincronização em lote) entra na fase de automação.

import https from "node:https";
import { gunzipSync } from "node:zlib";

const ENDPOINT =
  "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
const NS_NFE = "http://www.portalfiscal.inf.br/nfe";
const NS_WSDL = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe";
// Versão do schema distDFeInt (XSD distDFeInt_v1.01). NÃO é a versão da NF-e (4.00).
const VERSAO_DIST = "1.01";

export type DocumentoDistribuicao = { nsu: string; schema: string; xml: string };

export type RespostaDistribuicao = {
  cStat: string | null;
  xMotivo: string | null;
  documentos: DocumentoDistribuicao[];
};

type ConsultaChaveParams = {
  pfx: Buffer;
  senha: string;
  cnpj: string;
  uf: string;
  chave: string;
  tpAmb?: string;
};

export async function consultarPorChave(
  params: ConsultaChaveParams,
): Promise<RespostaDistribuicao> {
  const envelope = montarEnvelope(
    params.cnpj,
    params.uf,
    params.tpAmb ?? "1",
    `<consChNFe><chNFe>${params.chave}</chNFe></consChNFe>`,
  );
  const soap = await postSoap(envelope, params.pfx, params.senha);
  return parseResposta(soap);
}

function montarEnvelope(
  cnpj: string,
  uf: string,
  tpAmb: string,
  consulta: string,
): string {
  const distDFeInt =
    `<distDFeInt xmlns="${NS_NFE}" versao="${VERSAO_DIST}">` +
    `<tpAmb>${tpAmb}</tpAmb><cUFAutor>${uf}</cUFAutor>` +
    `<CNPJ>${cnpj}</CNPJ>${consulta}</distDFeInt>`;
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
    `<soap12:Body><nfeDistDFeInteresse xmlns="${NS_WSDL}">` +
    `<nfeDadosMsg>${distDFeInt}</nfeDadosMsg>` +
    `</nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`
  );
}

function postSoap(body: string, pfx: Buffer, passphrase: string): Promise<string> {
  const url = new URL(ENDPOINT);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: url.host,
        path: url.pathname,
        method: "POST",
        pfx,
        passphrase,
        minVersion: "TLSv1.2",
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function pick(xml: string, tag: string): string | null {
  return xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1] ?? null;
}

function parseResposta(soap: string): RespostaDistribuicao {
  const documentos: DocumentoDistribuicao[] = [];
  const re = /<docZip\s+NSU="(\d+)"\s+schema="([^"]+)">([^<]+)<\/docZip>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(soap)) !== null) {
    const [, nsu, schema, b64] = match;
    documentos.push({
      nsu,
      schema,
      xml: gunzipSync(Buffer.from(b64, "base64")).toString("utf8"),
    });
  }
  return {
    cStat: pick(soap, "cStat"),
    xMotivo: pick(soap, "xMotivo"),
    documentos,
  };
}
