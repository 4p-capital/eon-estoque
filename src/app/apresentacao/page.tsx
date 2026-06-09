import type { Metadata } from "next";

import { Apresentacao } from "@/app/apresentacao/_components/apresentacao";

export const metadata: Metadata = {
  title: "Apresentação — EON Instalações",
  description:
    "Controle de estoque anti-furto, por empresa e SPE, com QR em cada kit — do insumo à saída.",
};

// Página pública e temporária de apresentação do sistema (sem login, sem casca).
export default function ApresentacaoPage() {
  return <Apresentacao />;
}
