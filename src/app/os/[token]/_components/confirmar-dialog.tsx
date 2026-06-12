"use client";

import { useRef, useState, useTransition } from "react";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cpfValido, formatarCpfDigitando } from "@/lib/cpf";
import { confirmarRecebimento } from "@/app/os/[token]/actions";
import type { AcaoConfirmacao } from "@/app/os/[token]/recebimento-schema";

const NOME_MINIMO = 5;

type Props = {
  token: string;
  faltantes: number;
  estranhos: number;
  onConfirmado: (status: string) => void;
};

// Fechamento da OS na obra: Receber (só com 100%), Receber com divergência
// (exige divergência) ou Não receber (motivo obrigatório). A UI desabilita o
// que não se aplica, mas a regra de verdade é revalidada na RPC.
export function ConfirmarDialog({ token, faltantes, estranhos, onConfirmado }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const temDivergencia = faltantes > 0 || estranhos > 0;
  const [acao, setAcao] = useState<AcaoConfirmacao>(
    temDivergencia ? "receber_divergencia" : "receber",
  );
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [motivo, setMotivo] = useState("");
  const [ocupado, startTransition] = useTransition();

  function abrir() {
    setAcao(temDivergencia ? "receber_divergencia" : "receber");
    ref.current?.showModal();
  }

  const podeEnviar =
    nome.trim().length >= NOME_MINIMO &&
    cpfValido(cpf) &&
    (acao !== "recusar" || motivo.trim().length > 0);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await confirmarRecebimento({
        token,
        acao,
        nome,
        cpf,
        motivo: motivo || undefined,
      });
      if (res.resultado !== "confirmada") {
        toast.error(
          "mensagem" in res ? res.mensagem : "Não foi possível confirmar o recebimento.",
        );
        return;
      }
      ref.current?.close();
      onConfirmado(res.status);
    });
  }

  const opcoes: { valor: AcaoConfirmacao; rotulo: string; detalhe: string; habilitada: boolean }[] = [
    {
      valor: "receber",
      rotulo: "Receber",
      detalhe: "Todos os kits foram bipados e não há divergência.",
      habilitada: !temDivergencia,
    },
    {
      valor: "receber_divergencia",
      rotulo: "Receber com divergência",
      detalhe: `${faltantes} kit(s) sem bipe · ${estranhos} bipe(s) estranho(s) — fica registrado.`,
      habilitada: temDivergencia,
    },
    {
      valor: "recusar",
      rotulo: "Não receber",
      detalhe: "Recusa a carga inteira — os kits voltam no caminhão. Exige motivo.",
      habilitada: true,
    },
  ];

  return (
    <>
      <Button type="button" className="w-full" onClick={abrir}>
        <ClipboardCheck className="size-4" aria-hidden />
        Confirmar recebimento
      </Button>

      <dialog
        ref={ref}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-xl backdrop:bg-foreground/40"
      >
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Confirmar recebimento
          </h2>

          <fieldset className="space-y-2">
            <legend className="sr-only">Como deseja fechar este recebimento?</legend>
            {opcoes.map((o) => (
              <button
                key={o.valor}
                type="button"
                disabled={!o.habilitada}
                onClick={() => setAcao(o.valor)}
                aria-pressed={acao === o.valor}
                className={cn(
                  "block w-full rounded-lg border p-3 text-left transition-colors",
                  !o.habilitada && "cursor-not-allowed opacity-50",
                  acao === o.valor && o.habilitada
                    ? "border-primary bg-primary/5"
                    : "border-border",
                  o.habilitada && acao !== o.valor && "hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "block text-sm font-medium",
                    o.valor === "recusar" ? "text-destructive" : "text-foreground",
                  )}
                >
                  {o.rotulo}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{o.detalhe}</span>
              </button>
            ))}
          </fieldset>

          {acao === "recusar" && (
            <div>
              <label htmlFor="motivo-recusa" className={labelCls}>
                Motivo da recusa <span className="text-destructive">(obrigatório)</span>
              </label>
              <input
                id="motivo-recusa"
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="ex.: carga avariada no transporte"
                className={inputCls}
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="nome-recebedor" className={labelCls}>
                Seu nome completo
              </label>
              <input
                id="nome-recebedor"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Quem está recebendo"
                autoComplete="name"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cpf-recebedor" className={labelCls}>
                Seu CPF
              </label>
              <input
                id="cpf-recebedor"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(formatarCpfDigitando(e.target.value))}
                placeholder="000.000.000-00"
                className={inputCls}
              />
              {cpf.length > 0 && !cpfValido(cpf) && (
                <p className="mt-1 text-xs text-destructive">CPF incompleto ou inválido.</p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O recebimento fica registrado no seu nome para a conferência entre galpão e obra.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>
              Voltar
            </Button>
            <Button
              type="submit"
              variant={acao === "recusar" ? "destructive" : "default"}
              disabled={ocupado || !podeEnviar}
            >
              {ocupado ? "Enviando…" : "Confirmar"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
