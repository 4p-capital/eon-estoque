// Formatações do domínio fiscal (puras, sem dependência de browser/servidor).

export function formatarCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) {
    return cnpj;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// "85444900" -> "8544.49.00" (NCM 4-2-2). Mantém como veio se não tiver 8 dígitos.
export function formatarNcm(ncm: string | null): string {
  const d = (ncm ?? "").replace(/\D/g, "");
  if (d.length !== 8) {
    return ncm ?? "";
  }
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}

export function formatarData(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split("-");
  if (!ano || !mes || !dia) {
    return isoDate;
  }
  return `${dia}/${mes}/${ano}`;
}

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarMoeda(valor: number): string {
  return MOEDA.format(valor);
}

// dhEmi vem como "2025-11-01T16:21:00-03:00"; mostra só a data dd/mm/aaaa.
export function formatarDataHora(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  return formatarData(iso.slice(0, 10));
}

// Dias até a validade (negativo = vencido). Recebe a data de referência para
// ser determinística/testável; o chamador passa "hoje".
export function diasAteValidade(validadeIso: string, hoje: Date): number {
  const validade = new Date(`${validadeIso}T00:00:00`);
  const umDia = 1000 * 60 * 60 * 24;
  return Math.ceil((validade.getTime() - hoje.getTime()) / umDia);
}
