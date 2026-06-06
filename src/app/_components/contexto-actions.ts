"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { getSessao } from "@/lib/auth/sessao";
import { CTX_COOKIE } from "@/lib/auth/contexto";

// Troca o contexto do galpão. Valores:
//   "operacao"        -> volta à operação (todos)
//   "filtro:<tenant>" -> operação filtrada por um tenant
//   "tenant:<tenant>" -> entra na área do tenant (só o vinculado ao galpão)
export async function definirContexto(valor: string): Promise<void> {
  const sessao = await getSessao();
  if (!sessao?.isGalpao) {
    return; // só o galpão alterna contexto; cliente fica no próprio tenant
  }
  // "Entrar no tenant" só é permitido no tenant vinculado (ex.: EON).
  if (valor.startsWith("tenant:") && valor.slice(7) !== sessao.tenantId) {
    return;
  }

  const store = await cookies();
  if (valor === "operacao" || valor.length === 0) {
    store.delete(CTX_COOKIE);
  } else {
    store.set(CTX_COOKIE, valor, { path: "/", httpOnly: true, sameSite: "lax" });
  }
  revalidatePath("/", "layout");
}
