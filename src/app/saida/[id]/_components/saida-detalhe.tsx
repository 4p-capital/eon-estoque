"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { biparSaida, cancelarSaida, finalizarSaida } from "@/app/saida/actions";

type KitBipe = { numero: number };

export function SaidaDetalhe({
  saidaId,
  status,
  observacao,
  kitsIniciais,
}: {
  saidaId: string;
  status: string;
  observacao: string | null;
  kitsIniciais: KitBipe[];
}) {
  const router = useRouter();
  const [qr, setQr] = useState("");
  const [kits, setKits] = useState<KitBipe[]>(kitsIniciais);
  const [bipando, startBipe] = useTransition();
  const [agindo, startAcao] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const aberta = status === "aberta";

  function onBipe(e: React.FormEvent) {
    e.preventDefault();
    const code = qr.trim();
    if (!code) return;
    startBipe(async () => {
      const res = await biparSaida(saidaId, code);
      if (res.status === "error") {
        toast.error(res.message);
      } else {
        toast.success(`Kit #${res.numero} expedido.`);
        setKits((k) => [{ numero: res.numero }, ...k]);
        router.refresh();
      }
      setQr("");
      inputRef.current?.focus();
    });
  }

  function finalizar() {
    startAcao(async () => {
      const res = await finalizarSaida(saidaId);
      if (res.status === "error") toast.error(res.message ?? "Não foi possível finalizar.");
      else {
        toast.success("Saída finalizada.");
        router.refresh();
      }
    });
  }

  function cancelar() {
    startAcao(async () => {
      const res = await cancelarSaida(saidaId);
      if (res.status === "error") toast.error(res.message ?? "Não foi possível cancelar.");
      else {
        toast.success("Saída cancelada.");
        router.push("/saida");
      }
    });
  }

  return (
    <div className="space-y-6">
      {aberta ? (
        <form onSubmit={onBipe} className="rounded-xl bg-card p-5 shadow-sm">
          <label htmlFor="qr" className={labelCls}>
            Bipe o QR do kit
          </label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <ScanLine
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                ref={inputRef}
                id="qr"
                value={qr}
                onChange={(e) => setQr(e.target.value)}
                placeholder="Bipe ou digite o código…"
                aria-label="Código QR do kit"
                autoFocus
                autoComplete="off"
                className={`${inputCls} mt-0 pl-9`}
              />
            </div>
            <Button type="submit" disabled={bipando}>
              {bipando ? "Registrando…" : "Dar saída"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            O kit precisa ser do mesmo empreendimento e estar em estoque. Kit já expedido é recusado.
          </p>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={finalizar} disabled={agindo}>
              Finalizar saída
            </Button>
            {kits.length === 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelar}
                disabled={agindo}
                className="text-destructive hover:text-destructive"
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      ) : (
        <div className="rounded-xl bg-card p-5 text-sm text-muted-foreground shadow-sm">
          Esta remessa está <span className="font-medium text-foreground">{status}</span> e não aceita
          mais kits.
          {observacao ? <p className="mt-1">{observacao}</p> : null}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Kits na remessa ({kits.length})
        </h2>
        {kits.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum kit bipado ainda.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {kits.map((k, i) => (
              <li
                key={`${k.numero}-${i}`}
                className="flex items-center gap-2 rounded-lg bg-card px-4 py-2.5 text-sm shadow-sm"
              >
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                <span className="font-medium text-foreground">Kit #{k.numero}</span>
                <span className="ml-auto text-xs text-muted-foreground">expedido</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
