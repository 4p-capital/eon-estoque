// Papéis do usuário (espelho de app_metadata.papel e da tabela estoque.perfil).
//   galpao_*  -> staff do galpão (EON operação), cross-tenant, opera o estoque.
//   tenant_*  -> usuário do cliente, vê só o próprio tenant.
// Enforcement real é a RLS no banco (lê o JWT); aqui é o espelho para a UI/gating.
export const PAPEIS = [
  "galpao_admin",
  "galpao_operador",
  "tenant_admin",
  "tenant_gestor",
] as const;

export type Papel = (typeof PAPEIS)[number];

export function isPapel(value: unknown): value is Papel {
  return typeof value === "string" && (PAPEIS as readonly string[]).includes(value);
}

export function isGalpaoPapel(papel: Papel | null | undefined): boolean {
  return papel === "galpao_admin" || papel === "galpao_operador";
}

export function isTenantPapel(papel: Papel | null | undefined): boolean {
  return papel === "tenant_admin" || papel === "tenant_gestor";
}
