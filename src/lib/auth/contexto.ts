import "server-only";

import { cookies } from "next/headers";

import { getSessao, type Sessao } from "@/lib/auth/sessao";

// Contexto de navegação do usuário (cookie `eon_ctx`):
//   - operacao: visão do galpão (vê o operacional de TODOS os tenants), com um
//     filtro opcional por tenant só para visualização.
//   - tenant: dentro da área de um tenant (experiência do cliente). Para usuário
//     de cliente é sempre o tenant dele; para o galpão, só o tenant VINCULADO
//     (ex.: EON) — entrar em tenant de cliente não é permitido (cofre fiscal privado).
export type Contexto =
  | { modo: "operacao"; tenantFiltro: string | null }
  | { modo: "tenant"; tenantId: string };

export const CTX_COOKIE = "eon_ctx";

export async function getContexto(sessaoArg?: Sessao | null): Promise<Contexto | null> {
  const sessao = sessaoArg ?? (await getSessao());
  if (!sessao) {
    return null;
  }

  // Usuário de cliente: sempre dentro do próprio tenant, sem alternância.
  if (!sessao.isGalpao) {
    return sessao.tenantId ? { modo: "tenant", tenantId: sessao.tenantId } : null;
  }

  // Galpão: o contexto vem do cookie.
  const raw = (await cookies()).get(CTX_COOKIE)?.value ?? "";

  // "Entrar no tenant" só vale para o tenant VINCULADO ao galpão (ex.: EON).
  if (raw.startsWith("tenant:") && sessao.tenantId && raw.slice(7) === sessao.tenantId) {
    return { modo: "tenant", tenantId: sessao.tenantId };
  }
  if (raw.startsWith("filtro:")) {
    const id = raw.slice(7);
    if (id) {
      return { modo: "operacao", tenantFiltro: id };
    }
  }
  return { modo: "operacao", tenantFiltro: null };
}

// Tenant ativo para FILTRAR consultas operacionais:
//   - modo tenant -> escopa tudo nesse tenant;
//   - modo operacao com filtro -> filtra por esse tenant;
//   - modo operacao sem filtro -> null (todos).
export function tenantAtivo(contexto: Contexto | null): string | null {
  if (!contexto) return null;
  return contexto.modo === "tenant" ? contexto.tenantId : contexto.tenantFiltro;
}
