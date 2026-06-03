"use client";

import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UnidadeProduzida } from "@/app/producao/actions";

type Props = {
  unidades: UnidadeProduzida[];
  // Texto de fácil visualização na etiqueta (nome do empreendimento ou do kit).
  rotulo: string;
};

// Renderiza as etiquetas (QR + rótulo + número). Stopgap até a impressora térmica:
// "Imprimir" usa o navegador — o CSS .print-area (globals.css) isola só as etiquetas
// e cada uma quebra em sua própria página (print:break-after-page).
// Futuro: enfileirar na fila_impressao → agente no Pi imprime 1 QR por vez na TSC.
// Base pública para o QR apontar (configurável p/ produção via env; no dev cai
// na origem atual). O QR codifica a URL /k/<token> para abrir no celular.
function urlKit(qr: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return base ? `${base}/k/${qr}` : qr;
}

export function EtiquetasQr({ unidades, rotulo }: Props) {
  if (unidades.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {unidades.length} etiqueta{unidades.length === 1 ? "" : "s"} para imprimir
        </h2>
        <Button type="button" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          Imprimir
        </Button>
      </div>

      <div className="print-area grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:block">
        {unidades.map((u) => (
          <div
            key={u.qr_code}
            className="flex flex-col items-center gap-2 rounded-lg bg-card p-3 text-center shadow-sm print:flex print:h-screen print:break-after-page print:items-center print:justify-center print:shadow-none"
          >
            <QRCodeSVG value={urlKit(u.qr_code)} size={140} className="h-auto w-full max-w-[140px]" />
            <p className="w-full truncate text-xs font-semibold text-foreground" title={rotulo}>
              {rotulo}
            </p>
            <p className="text-[10px] tabular-nums text-muted-foreground">#{u.numero}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
