// Tipos do domínio fiscal compartilhados entre servidor (parser) e UI.
// Sem dependências — seguro de importar em Client Components.

export type NotaItem = {
  numero: number;
  codigo: string; // cProd
  descricao: string; // xProd
  ncm: string;
  cfop: string;
  unidade: string; // uCom
  quantidade: number; // qCom
  valorUnitario: number; // vUnCom
  valorTotal: number; // vProd
  ean: string | null; // cEAN (null quando "SEM GTIN")
};

export type NotaFiscalParsed = {
  chave: string;
  numero: string;
  serie: string;
  dataEmissao: string | null; // dhEmi (ISO)
  emitente: { nome: string; cnpj: string };
  destinatario: { nome: string; documento: string };
  valorTotal: number; // vNF
  itens: NotaItem[];
};

export const STATUS_NOTA = ["consultada", "recebida", "recebida_divergencia", "recusada"] as const;
export type StatusNota = (typeof STATUS_NOTA)[number];

// Item persistido pronto para conferência (já com o de-para resolvido, se houver).
export type ItemConferencia = {
  id: string;
  numItem: number;
  codigo: string;
  descricao: string;
  ncm: string;
  unidade: string;
  quantidade: number; // qtd da nota (teto do recebimento)
  valorUnitario: number;
  valorTotal: number;
  ean: string | null;
  insumoId: string | null;
  insumoNome: string | null;
  insumoNcm: string | null; // NCM do insumo cadastrado (base do alerta de divergência)
  fatorConversao: number;
  quantidadeRecebida: number | null;
};

export type NotaConferencia = {
  id: string;
  chave: string;
  numero: string;
  serie: string;
  emitenteNome: string;
  emitenteCnpj: string;
  destinatarioNome: string;
  valorTotal: number;
  dataEmissao: string | null;
  status: StatusNota;
  empreendimentoId: string | null;
};
