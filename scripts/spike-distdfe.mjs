// ============================================================================
// SPIKE 0a — NFeDistribuiçãoDFe (distNSU) com TLS mútuo via certificado A1.
//
// Objetivo: provar que conseguimos abrir conexão mTLS com a SEFAZ usando o .pfx
// da SPE e receber os RESUMOS (resNFe) das notas faturadas contra aquele CNPJ.
//
// NÃO tem dependência externa — só `https` e `zlib` nativos do Node.
// NÃO grava nada, NÃO manifesta nada. Só lê e imprime. Seguro de rodar.
//
// Config (a senha NUNCA vai pro chat nem pro repo): crie um arquivo gitignorado
// `.certs/spike.config.json` com:
//   {
//     "pfxPath": ".certs/bp-ga-035.pfx",
//     "pfxPass": "<senha do pfx>",
//     "cnpj":    "62241511000152",   // CNPJ da SPE (só dígitos)
//     "uf":      "52",               // cUFAutor (52 = GO)
//     "tpAmb":   "1",                // opcional, 1 = produção
//     "ultNSU":  "0"                 // opcional
//   }
// (variáveis de ambiente SEFAZ_* têm precedência, se preferir.)
//
//   node scripts/spike-distdfe.mjs
//
// Saída esperada: cStat 138 (documentos localizados) + lista de resumos, ou
// cStat 137 (nenhum documento). Qualquer outro cStat -> diagnosticar pelo xMotivo.
// ============================================================================

import https from "node:https";
import { gunzipSync } from "node:zlib";
import { readFileSync, existsSync } from "node:fs";

const CONFIG_PATH = ".certs/spike.config.json";
const fileCfg = existsSync(CONFIG_PATH)
  ? JSON.parse(readFileSync(CONFIG_PATH, "utf8"))
  : {};

const ENDPOINT =
  "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
const NS_NFE = "http://www.portalfiscal.inf.br/nfe";
const NS_WSDL =
  "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe";

function required(envName, cfgKey) {
  const value = process.env[envName] ?? fileCfg[cfgKey];
  if (!value) {
    console.error(
      `[spike] Falta "${cfgKey}" — defina em ${CONFIG_PATH} ou na env ${envName}.`,
    );
    process.exit(1);
  }
  return String(value);
}

const pfxPath = required("SEFAZ_PFX_PATH", "pfxPath");
const passphrase = required("SEFAZ_PFX_PASS", "pfxPass");
const cnpj = required("SEFAZ_CNPJ", "cnpj").replace(/\D/g, "");
const cUFAutor = required("SEFAZ_UF", "uf");
const tpAmb = process.env.SEFAZ_TPAMB ?? fileCfg.tpAmb ?? "1"; // 1 = produção
const ultNSU = String(process.env.SEFAZ_ULT_NSU ?? fileCfg.ultNSU ?? "0").padStart(15, "0");

// --- monta o XML da consulta distNSU ---------------------------------------
function buildEnvelope() {
  const distDFeInt =
    `<distDFeInt xmlns="${NS_NFE}" versao="1.01">` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<cUFAutor>${cUFAutor}</cUFAutor>` +
    `<CNPJ>${cnpj}</CNPJ>` +
    `<distNSU><ultNSU>${ultNSU}</ultNSU></distNSU>` +
    `</distDFeInt>`;

  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
    `<soap12:Body>` +
    `<nfeDistDFeInteresse xmlns="${NS_WSDL}">` +
    `<nfeDadosMsg>${distDFeInt}</nfeDadosMsg>` +
    `</nfeDistDFeInteresse>` +
    `</soap12:Body>` +
    `</soap12:Envelope>`
  );
}

// --- POST SOAP 1.2 com o A1 no TLS -----------------------------------------
function post(body) {
  const url = new URL(ENDPOINT);
  const options = {
    host: url.host,
    path: url.pathname,
    method: "POST",
    pfx: readFileSync(pfxPath),
    passphrase,
    minVersion: "TLSv1.2",
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// --- helpers de parse (sem dep de XML) -------------------------------------
function pick(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1] : null;
}

function extractDocs(xml) {
  const docs = [];
  const re = /<docZip\s+NSU="(\d+)"\s+schema="([^"]+)">([^<]+)<\/docZip>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const [, nsu, schema, b64] = m;
    const inner = gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
    docs.push({ nsu, schema, inner });
  }
  return docs;
}

// --- run -------------------------------------------------------------------
async function main() {
  console.log(`[spike] CNPJ=${cnpj} UF=${cUFAutor} tpAmb=${tpAmb} ultNSU=${ultNSU}`);
  console.log(`[spike] Conectando (mTLS) em ${ENDPOINT} ...`);

  const { status, body } = await post(buildEnvelope());
  console.log(`[spike] HTTP ${status}`);

  const cStat = pick(body, "cStat");
  const xMotivo = pick(body, "xMotivo");
  const ult = pick(body, "ultNSU");
  const max = pick(body, "maxNSU");
  console.log(`[spike] cStat=${cStat} xMotivo=${xMotivo}`);
  console.log(`[spike] ultNSU=${ult} maxNSU=${max}`);

  if (!cStat) {
    console.log("[spike] Resposta sem cStat — corpo bruto abaixo p/ diagnóstico:");
    console.log(body.slice(0, 2000));
    return;
  }

  const docs = extractDocs(body);
  console.log(`[spike] ${docs.length} documento(s) no lote:`);
  for (const d of docs) {
    const chave = (d.inner.match(/\b\d{44}\b/) || [])[0] ?? "(sem chave)";
    const tipo = pick(d.inner, "xNome") ? "resNFe" : d.schema;
    console.log(
      `  NSU ${d.nsu} | ${d.schema} | chave=${chave} | emit=${pick(d.inner, "xNome") ?? "-"} | vNF=${pick(d.inner, "vNF") ?? "-"} | ${tipo}`,
    );
  }

  console.log("\n[spike] ✅ Conexão mTLS funcionou. Critério 0a atendido se houver cStat 137/138.");
}

main().catch((err) => {
  console.error("[spike] FALHA:", err.message);
  process.exit(1);
});
