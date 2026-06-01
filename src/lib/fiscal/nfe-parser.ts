// Parser do XML autorizado da NF-e (procNFe/nfeProc v4.00) para a estrutura do
// domínio. USO NO SERVIDOR. Tolerante a namespace e a item único vs. lista.

import { XMLParser } from "fast-xml-parser";

import type { NotaFiscalParsed, NotaItem } from "@/lib/fiscal/types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string {
  if (value === null || value === undefined || typeof value === "object") {
    return "";
  }
  return String(value);
}

function num(value: unknown): number {
  const n = Number(str(value));
  return Number.isFinite(n) ? n : 0;
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function parseItem(raw: unknown): NotaItem {
  const det = asRecord(raw);
  const prod = asRecord(det.prod);
  const ean = str(prod.cEAN);
  return {
    numero: num(det["@_nItem"]),
    codigo: str(prod.cProd),
    descricao: str(prod.xProd),
    ncm: str(prod.NCM),
    cfop: str(prod.CFOP),
    unidade: str(prod.uCom),
    quantidade: num(prod.qCom),
    valorUnitario: num(prod.vUnCom),
    valorTotal: num(prod.vProd),
    ean: ean && ean.toUpperCase() !== "SEM GTIN" ? ean : null,
  };
}

export function parseProcNFe(xml: string): NotaFiscalParsed | null {
  const doc = asRecord(parser.parse(xml));
  const nfe = asRecord(asRecord(doc.nfeProc).NFe ?? doc.NFe);
  const inf = asRecord(nfe.infNFe);
  if (Object.keys(inf).length === 0) {
    return null;
  }

  const ide = asRecord(inf.ide);
  const emit = asRecord(inf.emit);
  const dest = asRecord(inf.dest);
  const total = asRecord(asRecord(inf.total).ICMSTot);

  return {
    chave: str(inf["@_Id"]).replace(/^NFe/, ""),
    numero: str(ide.nNF),
    serie: str(ide.serie),
    dataEmissao: str(ide.dhEmi) || null,
    emitente: { nome: str(emit.xNome), cnpj: str(emit.CNPJ) },
    destinatario: { nome: str(dest.xNome), documento: str(dest.CNPJ ?? dest.CPF) },
    valorTotal: num(total.vNF),
    itens: toArray(inf.det).map(parseItem),
  };
}
