"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { abrirSaida } from "@/app/saida/actions";

type Opcao = { id: string; nome: string };

export function AbrirSaidaForm({
  empreendimentos,
  onSuccess,
}: {
  empreendimentos: Opcao[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [empreendimentoId, setEmpreendimentoId] = useState("");
  const [destino, setDestino] = useState("");
  const [observacao, setObservacao] = useState("");
  const [pendente, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empreendimentoId) {
      toast.error("Selecione o empreendimento.");
      return;
    }
    startTransition(async () => {
      const res = await abrirSaida({
        empreendimentoId,
        destino: destino || undefined,
        observacao: observacao || undefined,
      });
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Saída aberta.");
      onSuccess?.();
      router.push(`/saida/${res.saidaId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="empreendimento" className={labelCls}>
          Empreendimento
        </label>
        <select
          id="empreendimento"
          value={empreendimentoId}
          onChange={(e) => setEmpreendimentoId(e.target.value)}
          className={inputCls}
        >
          <option value="">Selecione…</option>
          {empreendimentos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="destino" className={labelCls}>
          Destino <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="destino"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          placeholder="Obra, caminhão, responsável…"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="observacao" className={labelCls}>
          Observação <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="observacao"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Detalhes da remessa…"
          className={inputCls}
        />
      </div>

      <Button type="submit" disabled={pendente || !empreendimentoId} className="w-full">
        <Truck className="size-4" aria-hidden />
        {pendente ? "Abrindo…" : "Abrir saída"}
      </Button>
    </form>
  );
}
