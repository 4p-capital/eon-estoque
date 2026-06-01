// Parse da chave de acesso da NF-e (44 dígitos). Toda a identificação da nota
// está embutida nela — útil para validar a leitura do barcode e exibir contexto
// antes mesmo de consultar a SEFAZ.
//
// Layout: cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)

export type ChaveNfe = {
  chave: string;
  uf: string; // código IBGE da UF do emitente
  ano: string;
  mes: string;
  cnpjEmitente: string;
  modelo: string;
  serie: string;
  numero: string;
};

// Aceita a chave com espaços/pontuação (como sai do scanner) e devolve só os 44 dígitos.
export function limparChave(bruto: string): string {
  return bruto.replace(/\D/g, "");
}

export function isChaveValida(chave: string): boolean {
  return /^\d{44}$/.test(chave);
}

export function parseChave(bruto: string): ChaveNfe | null {
  const chave = limparChave(bruto);
  if (!isChaveValida(chave)) {
    return null;
  }
  return {
    chave,
    uf: chave.slice(0, 2),
    ano: chave.slice(2, 4),
    mes: chave.slice(4, 6),
    cnpjEmitente: chave.slice(6, 20),
    modelo: chave.slice(20, 22),
    serie: chave.slice(22, 25),
    numero: chave.slice(25, 34),
  };
}
