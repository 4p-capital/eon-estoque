import type { TagColor } from "@/components/ui/tag";

// Ciclo de vida da OS de expedição (tabela saida.status) — labels/cores únicos
// para card da lista, detalhe e card de recebimento.
export const STATUS_SAIDA: Record<string, { label: string; cor: TagColor }> = {
  aberta: { label: "Aberta", cor: "blue" },
  finalizada: { label: "Em recebimento", cor: "violet" },
  recebida: { label: "Recebida", cor: "green" },
  recebida_divergencia: { label: "Recebida c/ divergência", cor: "amber" },
  recusada: { label: "Recusada", cor: "red" },
  cancelada: { label: "Cancelada", cor: "slate" },
};

export function statusSaida(status: string | null | undefined): { label: string; cor: TagColor } {
  return STATUS_SAIDA[status ?? ""] ?? { label: status ?? "—", cor: "slate" };
}
