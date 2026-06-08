"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, ScanLine, Truck } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { registrarSaida } from "@/app/saida/actions";

type Bipe = { numero: number; hora: string };

export function SaidaBipe() {
  const [qr, setQr] = useState("");
  const [destino, setDestino] = useState("");
  const [bipes, setBipes] = useState<Bipe[]>([]);
  const [pendente, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = qr.trim();
    if (!code) return;
    startTransition(async () => {
      const res = await registrarSaida(code, destino);
      if (res.status === "error") {
        toast.error(res.message);
      } else {
        toast.success(`Kit #${res.numero} expedido.`);
        setBipes((b) => [
          { numero: res.numero, hora: new Date().toLocaleTimeString("pt-BR") },
          ...b,
        ]);
      }
      setQr("");
      inputRef.current?.focus();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-xl bg-card p-5 shadow-sm">
        {/* Destino — persiste entre os bipes da sessão. */}
        <label htmlFor="destino" className={labelCls}>
          Destino <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <div className="relative mt-1">
          <Truck
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="destino"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Obra, caminhão, responsável…"
            aria-label="Destino da expedição"
            autoComplete="off"
            className={`${inputCls} mt-0 pl-9`}
          />
        </div>

        <label htmlFor="qr" className={`${labelCls} mt-4`}>
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
          <Button type="submit" disabled={pendente}>
            {pendente ? "Registrando…" : "Dar saída"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A saída move a unidade para “expedido” e registra a movimentação. Kit já expedido é recusado.
        </p>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Saídas nesta sessão ({bipes.length})
        </h2>
        {bipes.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma saída registrada ainda.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {bipes.map((b, i) => (
              <li
                key={`${b.numero}-${i}`}
                className="flex items-center gap-2 rounded-lg bg-card px-4 py-2.5 text-sm shadow-sm"
              >
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                <span className="font-medium text-foreground">Kit #{b.numero}</span>
                <span className="text-xs text-muted-foreground">expedido</span>
                <span className="ml-auto text-xs text-muted-foreground">{b.hora}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
