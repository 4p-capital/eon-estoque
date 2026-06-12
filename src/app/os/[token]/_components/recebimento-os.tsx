"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, TriangleAlert } from "lucide-react";

import { Tag, type TagColor } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import { tokenFromScan } from "@/lib/qr";
import { biparRecebimento } from "@/app/os/[token]/actions";
import { Comprovante } from "@/app/os/[token]/_components/comprovante";
import { ConfirmarDialog } from "@/app/os/[token]/_components/confirmar-dialog";
import { KitsChecklist } from "@/app/os/[token]/_components/kits-checklist";
import { ScannerQr } from "@/app/os/[token]/_components/scanner-qr";
import type { BipeEstranho, OsPublica } from "@/app/os/[token]/recebimento-schema";

// Re-leituras do mesmo QR pela câmera dentro desta janela são ignoradas.
const DEDUPE_MS = 2500;

const STATUS_TAG: Record<string, { label: string; cor: TagColor }> = {
  aberta: { label: "Em preparação", cor: "blue" },
  finalizada: { label: "Em recebimento", cor: "violet" },
  recebida: { label: "Recebida", cor: "green" },
  recebida_divergencia: { label: "Recebida c/ divergência", cor: "amber" },
  recusada: { label: "Recusada", cor: "red" },
  cancelada: { label: "Cancelada", cor: "slate" },
};

type Feedback = { tipo: "ok" | "aviso" | "erro"; texto: string };

function dataHoraBR(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Orquestrador do recebimento público: estado dos bipes deste aparelho como
// OVERLAY sobre o payload do servidor (router.refresh() reconcilia — inclusive
// bipes de outros celulares na mesma OS).
export function RecebimentoOs({ token, inicial }: { token: string; inicial: OsPublica }) {
  const router = useRouter();
  const [entreguesLocais, setEntreguesLocais] = useState<ReadonlyMap<number, string>>(new Map());
  const [estranhosLocais, setEstranhosLocais] = useState<BipeEstranho[]>([]);
  const [statusLocal, setStatusLocal] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const processadosRef = useRef(new Set<string>());
  const recentesRef = useRef(new Map<string, number>());
  const bipandoRef = useRef(false);

  const os = inicial.os;
  const status = statusLocal ?? os.status;

  const kits = useMemo(
    () =>
      inicial.kits.map((k) => {
        const entregueLocal = entreguesLocais.get(k.numero);
        return entregueLocal
          ? { ...k, status: "entregue", entregue_em: entregueLocal }
          : k;
      }),
    [inicial.kits, entreguesLocais],
  );
  const estranhos = useMemo(() => {
    const vistos = new Set(inicial.estranhos.map((e) => e.qr_code));
    return [...inicial.estranhos, ...estranhosLocais.filter((e) => !vistos.has(e.qr_code))];
  }, [inicial.estranhos, estranhosLocais]);

  const total = kits.length;
  const entregues = kits.filter((k) => k.status === "entregue").length;
  const faltantes = total - entregues;
  const janelaAtiva = os.janela_ativa && statusLocal === null;

  async function handleScan(raw: string) {
    const codigo = tokenFromScan(raw);
    if (!codigo) return;
    const agora = Date.now();
    if (processadosRef.current.has(codigo)) return;
    const ultimaLeitura = recentesRef.current.get(codigo);
    if (ultimaLeitura && agora - ultimaLeitura < DEDUPE_MS) return;
    recentesRef.current.set(codigo, agora);
    if (bipandoRef.current) return;
    bipandoRef.current = true;

    try {
      const res = await biparRecebimento(token, codigo);
      switch (res.resultado) {
        case "entregue":
          processadosRef.current.add(codigo);
          setEntreguesLocais((m) => new Map(m).set(res.numero, new Date().toISOString()));
          setFeedback({
            tipo: "ok",
            texto: `Kit #${res.numero} recebido (${res.entregues} de ${res.total}).`,
          });
          navigator.vibrate?.(80);
          router.refresh();
          break;
        case "duplicado":
          processadosRef.current.add(codigo);
          setFeedback({ tipo: "aviso", texto: res.mensagem });
          break;
        case "estranho":
          processadosRef.current.add(codigo);
          setEstranhosLocais((lista) => [
            ...lista,
            { qr_code: codigo, motivo: res.motivo, bipado_em: new Date().toISOString() },
          ]);
          setFeedback({ tipo: "erro", texto: res.mensagem });
          navigator.vibrate?.([60, 60, 60]);
          router.refresh();
          break;
        case "nao_encontrada":
          setFeedback({ tipo: "erro", texto: "OS não encontrada. Recarregue a página." });
          break;
        default:
          setFeedback({ tipo: "erro", texto: res.mensagem });
          router.refresh();
      }
    } finally {
      bipandoRef.current = false;
    }
  }

  function onConfirmado(novoStatus: string) {
    setStatusLocal(novoStatus);
    router.refresh();
  }

  const tag = STATUS_TAG[status] ?? { label: status, cor: "slate" as TagColor };
  const encerradaSemDesfecho = status === "finalizada" && !janelaAtiva;
  const comDesfecho = status === "recebida" || status === "recebida_divergencia" || status === "recusada";

  return (
    <div className="space-y-4">
      {/* Cabeçalho da OS */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              OS #{os.numero}
            </p>
            <h1 className="font-heading mt-0.5 truncate text-lg font-semibold text-foreground">
              {os.empreendimento_nome ?? "Expedição"}
            </h1>
            {os.destino && <p className="truncate text-xs text-muted-foreground">{os.destino}</p>}
          </div>
          <Tag color={tag.cor}>{tag.label}</Tag>
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {entregues}
            <span className="text-sm font-normal text-muted-foreground"> de {total} recebidos</span>
          </p>
          {janelaAtiva && os.recebimento_expira_em && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              até {dataHoraBR(os.recebimento_expira_em)}
            </p>
          )}
        </div>
      </div>

      {/* Estado: comprovante, encerrada, em preparação ou bipando */}
      {comDesfecho && (
        <Comprovante os={os} totais={{ entregues, total, estranhos: estranhos.length }} />
      )}

      {status === "aberta" && (
        <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground shadow-sm">
          Esta OS ainda está sendo preparada no galpão — o recebimento abre quando a saída for
          finalizada.
        </p>
      )}
      {status === "cancelada" && (
        <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground shadow-sm">
          Esta OS foi cancelada no galpão.
        </p>
      )}
      {encerradaSemDesfecho && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm text-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          A janela de recebimento desta OS expirou. Procure o galpão EON para prorrogar — o mesmo
          link volta a funcionar.
        </p>
      )}

      {janelaAtiva && (
        <>
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Bipe cada kit que chegou
            </h2>
            <ScannerQr onScan={handleScan} />
            {feedback && (
              <p
                role="status"
                className={cn(
                  "mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  feedback.tipo === "ok" && "bg-success/10 text-success",
                  feedback.tipo === "aviso" && "bg-warning/15 text-foreground",
                  feedback.tipo === "erro" && "bg-destructive/10 text-destructive",
                )}
              >
                {feedback.tipo === "ok" ? (
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                ) : (
                  <TriangleAlert className="size-4 shrink-0" aria-hidden />
                )}
                {feedback.texto}
              </p>
            )}
          </div>
          <ConfirmarDialog
            token={token}
            faltantes={faltantes}
            estranhos={estranhos.length}
            onConfirmado={onConfirmado}
          />
        </>
      )}

      {total > 0 && (status !== "aberta" || entregues > 0) && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Kits da OS ({total})
          </h2>
          <KitsChecklist kits={kits} estranhos={estranhos} />
        </section>
      )}
    </div>
  );
}
