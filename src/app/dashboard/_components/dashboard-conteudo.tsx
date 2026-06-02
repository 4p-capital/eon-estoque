import { Boxes, Package, ShoppingCart } from "lucide-react";

import { StatCard } from "@/app/_components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resumoDashboard } from "@/lib/dashboard";
import type { KitPossivel, PontoPedido } from "@/lib/types";

const nf = new Intl.NumberFormat("pt-BR");

export function DashboardConteudo({ kits, pontos }: { kits: KitPossivel[]; pontos: PontoPedido[] }) {
  const resumo = resumoDashboard(kits, pontos);
  const maxQtd = Math.max(1, ...kits.map((k) => k.qtd_possivel ?? 0));

  return (
    <div className="space-y-10">
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Package}
          label="Kits possíveis agora"
          value={nf.format(resumo.totalKits)}
          hint={`${nf.format(kits.length)} tipos de kit`}
          index={0}
        />
        <StatCard
          icon={Boxes}
          label="Insumos monitorados"
          value={nf.format(resumo.insumosMonitorados)}
          index={1}
        />
        <StatCard
          icon={ShoppingCart}
          label="Insumos a comprar"
          value={nf.format(resumo.aComprar)}
          hint={resumo.aComprar > 0 ? "Abaixo do ponto de pedido" : "Tudo acima do ponto"}
          alerta={resumo.aComprar > 0}
          index={2}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <KitsPossiveis kits={kits} maxQtd={maxQtd} />
        <PontoDePedido pontos={pontos} />
      </div>
    </div>
  );
}

function KitsPossiveis({ kits, maxQtd }: { kits: KitPossivel[]; maxQtd: number }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Kits possíveis agora
      </h2>
      <div className="space-y-3">
        {kits.map((k, i) => {
          const qtd = k.qtd_possivel ?? 0;
          const pct = Math.round((qtd / maxQtd) * 100);
          return (
            <Card
              key={k.tipo_kit_id}
              size="sm"
              className="stagger gap-2 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:ring-foreground/20"
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-foreground">{k.tipo_kit_nome}</span>
                <span
                  className={`text-2xl font-semibold tabular-nums ${
                    qtd > 0 ? "text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  {nf.format(qtd)}
                </span>
              </div>
              <Progress value={pct} className="h-1.5" />
              {k.insumo_gargalo_nome && (
                <p className="text-xs text-muted-foreground">
                  Gargalo:{" "}
                  <span className="font-medium text-foreground">{k.insumo_gargalo_nome}</span>
                </p>
              )}
            </Card>
          );
        })}
        {kits.length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum tipo de kit cadastrado ainda.
          </p>
        )}
      </div>
    </section>
  );
}

function PontoDePedido({ pontos }: { pontos: PontoPedido[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Estoque & ponto de pedido
      </h2>
      <Card className="gap-0 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Ponto</TableHead>
              <TableHead className="text-right">Comprar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pontos.map((p) => (
              <TableRow key={p.insumo_id}>
                <TableCell className="text-foreground">{p.nome}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {nf.format(p.saldo ?? 0)} {p.unidade}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {nf.format(p.ponto_pedido ?? 0)}
                </TableCell>
                <TableCell className="text-right">
                  {p.precisa_comprar ? (
                    <Badge variant="destructive">
                      {nf.format(p.sugestao_compra ?? 0)} {p.unidade}
                    </Badge>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-success" aria-hidden />
                      OK
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {pontos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  Nenhum insumo monitorado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
