"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { inputCls } from "@/app/_components/form-styles";
import { InsumoPicker, type InsumoOption, type LinhaInsumo } from "@/app/tipos-kit/_components/insumo-picker";
import { mapearInsumo } from "@/app/entrada/actions";
import type { ItemConferencia } from "@/lib/fiscal/types";

const VAZIO: LinhaInsumo = { insumoId: null, nome: "", unidade: "", isNew: false };

type Props = {
  item: ItemConferencia;
  emitenteCnpj: string;
  insumos: InsumoOption[];
  onMapeado: (itemId: string, insumoId: string, insumoNome: string, fator: number) => void;
};

// Linha de mapeamento de um item ainda sem insumo: escolhe/cria o insumo,
// define o fator de conversão (ex.: 1 rolo = 100 m) e salva o de-para.
export function MapearItem({ item, emitenteCnpj, insumos, onMapeado }: Props) {
  const [linha, setLinha] = useState<LinhaInsumo>(VAZIO);
  const [fator, setFator] = useState(1);
  const [pending, startTransition] = useTransition();

  function salvar() {
    const escolheu = linha.insumoId || (linha.isNew && linha.nome);
    if (!escolheu) {
      toast.error("Escolha um insumo existente ou crie um novo.");
      return;
    }
    if (linha.isNew && !linha.unidade.trim()) {
      toast.error(`Informe a unidade do novo insumo "${linha.nome}".`);
      return;
    }
    startTransition(async () => {
      const res = await mapearInsumo({
        notaItemId: item.id,
        emitenteCnpj,
        codigoProduto: item.codigo,
        descricaoFornecedor: item.descricao,
        ean: item.ean,
        ncm: item.ncm,
        fatorConversao: fator,
        insumoId: linha.insumoId ?? undefined,
        novoInsumoNome: linha.isNew ? linha.nome : undefined,
        novoInsumoUnidade: linha.isNew ? linha.unidade : undefined,
      });
      if (res.ok && res.insumoId) {
        toast.success(`"${item.descricao}" mapeado para ${res.insumoNome}.`);
        onMapeado(item.id, res.insumoId, res.insumoNome ?? linha.nome, fator);
      } else {
        toast.error(res.message ?? "Não foi possível mapear.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-sm font-medium text-foreground">{item.descricao}</p>
      <p className="text-xs text-muted-foreground">
        Cód. {item.codigo} · NCM {item.ncm} · {item.quantidade} {item.unidade}
        {item.ean ? ` · EAN ${item.ean}` : ""}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem_auto] sm:items-start">
        <InsumoPicker insumos={insumos} value={linha} onChange={setLinha} />
        <div>
          <input
            type="number"
            min={0.001}
            step="0.001"
            value={fator}
            onChange={(e) => setFator(Number(e.target.value))}
            className={inputCls}
            aria-label="Fator de conversão"
            title="Fator de conversão (ex.: 1 rolo = 100 m)"
          />
          <p className="mt-1 text-[10px] leading-tight text-muted-foreground">fator (ex.: 1 cx = 100)</p>
        </div>
        <Button type="button" onClick={salvar} disabled={pending} className="h-[42px]">
          Salvar
        </Button>
      </div>
    </div>
  );
}
