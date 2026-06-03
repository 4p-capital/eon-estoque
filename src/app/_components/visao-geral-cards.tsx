import { AlertTriangle, Boxes, Package } from "lucide-react";

import { StatCard } from "@/app/_components/stat-card";
import { resumoDashboard } from "@/lib/dashboard";
import type { KitPossivel, PontoPedido } from "@/lib/types";

const nf = new Intl.NumberFormat("pt-BR");

type Props = { kits: KitPossivel[]; pontos: PontoPedido[] };

// Cards de KPI da home (/): quantidade total em estoque, kits possíveis
// agora e insumos abaixo do ponto de pedido.
export function VisaoGeralCards({ kits, pontos }: Props) {
  const resumo = resumoDashboard(kits, pontos);

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <StatCard
        icon={Boxes}
        label="Quantidade total em estoque"
        value={nf.format(resumo.totalEstoque)}
        hint={`${nf.format(resumo.insumosMonitorados)} insumos monitorados`}
        index={0}
      />
      <StatCard
        icon={Package}
        label="Kits possíveis"
        value={nf.format(resumo.totalKits)}
        hint={`${nf.format(kits.length)} tipos de kit`}
        index={1}
      />
      <StatCard
        icon={AlertTriangle}
        label="Abaixo do ponto de pedido"
        value={nf.format(resumo.aComprar)}
        hint={resumo.aComprar > 0 ? "Insumos a comprar" : "Tudo acima do ponto"}
        alerta={resumo.aComprar > 0}
        index={2}
      />
    </section>
  );
}
