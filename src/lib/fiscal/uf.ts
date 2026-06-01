// Unidades federativas com código IBGE (2 dígitos) — usado como `cUFAutor` na
// SEFAZ e o mesmo prefixo que abre a chave de acesso da NF-e.

export const UFS = [
  { codigo: "11", sigla: "RO", nome: "Rondônia" },
  { codigo: "12", sigla: "AC", nome: "Acre" },
  { codigo: "13", sigla: "AM", nome: "Amazonas" },
  { codigo: "14", sigla: "RR", nome: "Roraima" },
  { codigo: "15", sigla: "PA", nome: "Pará" },
  { codigo: "16", sigla: "AP", nome: "Amapá" },
  { codigo: "17", sigla: "TO", nome: "Tocantins" },
  { codigo: "21", sigla: "MA", nome: "Maranhão" },
  { codigo: "22", sigla: "PI", nome: "Piauí" },
  { codigo: "23", sigla: "CE", nome: "Ceará" },
  { codigo: "24", sigla: "RN", nome: "Rio Grande do Norte" },
  { codigo: "25", sigla: "PB", nome: "Paraíba" },
  { codigo: "26", sigla: "PE", nome: "Pernambuco" },
  { codigo: "27", sigla: "AL", nome: "Alagoas" },
  { codigo: "28", sigla: "SE", nome: "Sergipe" },
  { codigo: "29", sigla: "BA", nome: "Bahia" },
  { codigo: "31", sigla: "MG", nome: "Minas Gerais" },
  { codigo: "32", sigla: "ES", nome: "Espírito Santo" },
  { codigo: "33", sigla: "RJ", nome: "Rio de Janeiro" },
  { codigo: "35", sigla: "SP", nome: "São Paulo" },
  { codigo: "41", sigla: "PR", nome: "Paraná" },
  { codigo: "42", sigla: "SC", nome: "Santa Catarina" },
  { codigo: "43", sigla: "RS", nome: "Rio Grande do Sul" },
  { codigo: "50", sigla: "MS", nome: "Mato Grosso do Sul" },
  { codigo: "51", sigla: "MT", nome: "Mato Grosso" },
  { codigo: "52", sigla: "GO", nome: "Goiás" },
  { codigo: "53", sigla: "DF", nome: "Distrito Federal" },
] as const;

const CODIGOS: Set<string> = new Set(UFS.map((uf) => uf.codigo));

export function isCodigoUf(value: string): boolean {
  return CODIGOS.has(value);
}
