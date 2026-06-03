"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import { abrirLote } from "@/app/producao/actions";

type Opcao = { id: string; nome: string };

type Props = {
  kits: Opcao[];
  empreendimentos: Opcao[];
};

export function AbrirLoteForm({ kits, empreendimentos }: Props) {
  const router = useRouter();
  const [tipoKitId, setTipoKitId] = useState("");
  const [empreendimentoId, setEmpreendimentoId] = useState("");
  const [meta, setMeta] = useState("");
  const [pendente, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipoKitId || !empreendimentoId) {
      toast.error("Selecione o tipo de kit e o empreendimento.");
      return;
    }
    startTransition(async () => {
      const res = await abrirLote({
        tipoKitId,
        empreendimentoId,
        meta: meta ? Number(meta) : null,
      });
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Lote aberto.");
      router.push(`/producao/${res.loteId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-card p-5 text-card-foreground shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tipo-kit" className={labelCls}>
            Tipo de kit
          </label>
          <select id="tipo-kit" value={tipoKitId} onChange={(e) => setTipoKitId(e.target.value)} className={inputCls}>
            <option value="">Selecione…</option>
            {kits.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nome}
              </option>
            ))}
          </select>
        </div>
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
      </div>

      <div className="max-w-[12rem]">
        <label htmlFor="meta" className={labelCls}>
          Meta <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="meta"
          type="number"
          min={1}
          step={1}
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          placeholder="ex.: 50"
          className={inputCls}
        />
      </div>

      <Button type="submit" disabled={pendente || !tipoKitId || !empreendimentoId} className="w-full sm:w-auto">
        <PackagePlus className="size-4" aria-hidden />
        {pendente ? "Abrindo…" : "Abrir lote"}
      </Button>
    </form>
  );
}
