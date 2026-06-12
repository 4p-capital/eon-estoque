// CPF — validação por dígitos verificadores e máscaras de exibição/digitação.
// Espelha estoque.cpf_valido (SQL): a RPC é a fronteira de confiança; aqui é
// feedback imediato no client e narrowing no zod das actions.

const CPF_TAMANHO = 11;

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function cpfValido(valor: string): boolean {
  const v = somenteDigitos(valor);
  if (v.length !== CPF_TAMANHO) return false;
  if (/^(\d)\1{10}$/.test(v)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(v[i]) * (10 - i);
  let dv = (soma * 10) % 11;
  if (dv === 10) dv = 0;
  if (dv !== Number(v[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(v[i]) * (11 - i);
  dv = (soma * 10) % 11;
  if (dv === 10) dv = 0;
  return dv === Number(v[10]);
}

// "12345678901" -> "***.456.789-**" (máscara de exibição, padrão gov.br).
export function mascararCpf(valor: string): string {
  const v = somenteDigitos(valor);
  if (v.length !== CPF_TAMANHO) return valor;
  return `***.${v.slice(3, 6)}.${v.slice(6, 9)}-**`;
}

// Máscara progressiva para input: "123" -> "123", "1234" -> "123.4", etc.
export function formatarCpfDigitando(valor: string): string {
  const v = somenteDigitos(valor).slice(0, CPF_TAMANHO);
  if (v.length <= 3) return v;
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
}
