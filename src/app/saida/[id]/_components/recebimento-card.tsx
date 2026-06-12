"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { CalendarClock, Check, Copy, Printer, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { prorrogarRecebimento } from "@/app/saida/actions";
import { statusSaida } from "@/app/saida/_components/status-saida";

export type RecebimentoInfo = {
  saidaId: string;
  numero: number | null;
  status: string | null;
  empreendimentoNome: string | null;
  token: string | null;
  expiraEm: string | null;
  recebidoEm: string | null;
  recebedorNome: string | null;
  recebedorCpfMascarado: string | null;
  recusaMotivo: string | null;
  qtdKits: number;
  qtdEntregues: number;
  qtdEstranhos: number;
};
export type BipeEstranhoRow = { qr_code: string; motivo: string; bipado_em: string | null };

function dataHoraBR(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function urlOs(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return base ? `${base}/os/${token}` : token;
}

// Bloco do recebimento na visão do GALPÃO: link/QR público da OS (imprime e
// viaja com o caminhão), confronto saída × obra (n/m + estranhos), janela e
// recebedor. Prorrogar é ação de gerente (o banco revalida).
export function RecebimentoCard({
  info,
  estranhos,
  isGerente,
}: {
  info: RecebimentoInfo;
  estranhos: BipeEstranhoRow[];
  isGerente: boolean;
}) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [prorrogando, startProrrogar] = useTransition();
  // Relógio fora do render (regra de pureza): null no 1º paint, resolve no effect.
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza o relógio (sistema externo) uma única vez no mount
    setAgora(Date.now());
  }, []);

  const aguardando = info.status === "finalizada";
  const expirada =
    aguardando &&
    agora !== null &&
    (!info.expiraEm || new Date(info.expiraEm).getTime() <= agora);
  const faltantes = info.qtdKits - info.qtdEntregues;
  const temDivergencia = faltantes > 0 || info.qtdEstranhos > 0;
  const link = info.token ? urlOs(info.token) : null;
  const tag = statusSaida(info.status);

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      toast.success("Link do recebimento copiado.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar — selecione o link manualmente.");
    }
  }

  function prorrogar() {
    startProrrogar(async () => {
      const res = await prorrogarRecebimento(info.saidaId);
      if (res.status === "error") toast.error(res.message ?? "Não foi possível prorrogar.");
      else {
        toast.success("Janela de recebimento prorrogada por +48h.");
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-xl bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recebimento na obra
        </h2>
        <Tag color={tag.cor}>{tag.label}</Tag>
      </div>

      {/* Confronto saída × obra */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {info.qtdEntregues}
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            de {info.qtdKits} recebidos
          </span>
        </p>
        {temDivergencia && info.status !== "finalizada" && (
          <Tag color="red">
            {faltantes > 0 ? `${faltantes} sem bipe` : ""}
            {faltantes > 0 && info.qtdEstranhos > 0 ? " · " : ""}
            {info.qtdEstranhos > 0 ? `${info.qtdEstranhos} estranho(s)` : ""}
          </Tag>
        )}
      </div>

      {/* Janela / desfecho */}
      {aguardando && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          {expirada ? (
            <span className="font-medium text-destructive">
              Janela de recebimento expirada
              {info.expiraEm ? ` em ${dataHoraBR(info.expiraEm)}` : ""}.
            </span>
          ) : (
            <>A obra pode bipar até {dataHoraBR(info.expiraEm)}.</>
          )}
        </p>
      )}
      {info.recebidoEm && (
        <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Recebido por</dt>
            <dd className="text-right font-medium text-foreground">
              {info.recebedorNome ?? "—"}
              {info.recebedorCpfMascarado ? ` · ${info.recebedorCpfMascarado}` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Confirmado em</dt>
            <dd className="text-right font-medium text-foreground">{dataHoraBR(info.recebidoEm)}</dd>
          </div>
          {info.recusaMotivo && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Motivo da recusa</dt>
              <dd className="text-right font-medium text-foreground">{info.recusaMotivo}</dd>
            </div>
          )}
        </dl>
      )}

      {/* Bipes estranhos (divergência auditável) */}
      {estranhos.length > 0 && (
        <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
            <TriangleAlert className="size-3.5" aria-hidden />
            Bipes estranhos na obra ({estranhos.length})
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            {estranhos.map((e) => (
              <li key={e.qr_code}>
                <span className="font-medium text-foreground">{e.motivo}</span>
                {" · "}
                {dataHoraBR(e.bipado_em)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Link público + QR para imprimir (viaja com o caminhão) */}
      {link && aguardando && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
              {link}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copiar}>
              {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              Copiar link
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              Imprimir OS
            </Button>
            {isGerente && expirada && (
              <ConfirmDialog
                title="Prorrogar recebimento?"
                description="A janela é estendida por +48h a partir de agora. O mesmo link/QR impresso continua valendo."
                confirmLabel="Prorrogar +48h"
                triggerAriaLabel="Prorrogar recebimento"
                busy={prorrogando}
                onConfirm={prorrogar}
                triggerClassName="inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <CalendarClock className="size-4" aria-hidden />
                Prorrogar +48h
              </ConfirmDialog>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Imprima e mande com o caminhão: na obra, quem receber abre o QR no celular e bipa os
            kits — sem login. O link é a credencial desta OS.
          </p>

          {/* Única .print-area da página: o que sai na impressão é só este bloco. */}
          <div className="print-area flex items-center gap-4 rounded-lg border border-dashed border-border p-4 print:h-screen print:flex-col print:justify-center print:border-0">
            <QRCodeSVG value={link} size={112} className="h-auto shrink-0 print:w-64" />
            <div className="min-w-0 print:text-center">
              <p className="font-heading text-lg font-bold text-foreground">OS #{info.numero}</p>
              <p className="truncate text-sm text-foreground">{info.empreendimentoNome ?? ""}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recebimento de kits — aponte a câmera do celular para abrir.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
