"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { inputCls } from "@/app/_components/form-styles";

export type InsumoOption = { id: string; nome: string; unidade: string; estoqueMin: number };

export type LinhaInsumo = {
  insumoId: string | null;
  nome: string;
  unidade: string;
  isNew: boolean;
};

// O que o picker devolve ao escolher/digitar: além da linha, o mínimo GLOBAL do
// insumo selecionado (0 quando é texto livre, novo, ou existente sem mínimo).
export type SelecaoInsumo = LinhaInsumo & { estoqueMin: number };

type Props = {
  insumos: InsumoOption[];
  value: LinhaInsumo;
  onChange: (v: SelecaoInsumo) => void;
};

const MAX_SUGESTOES = 20;

// Normaliza p/ busca: remove acentos e baixa caixa ("Plástico" -> "plastico").
function normaliza(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

// Campo "buscar ou criar": digita o nome, escolhe um insumo existente ou cria
// um novo inline. Reaproveita o insumo compartilhado (evita duplicado).
// Busca sem acento e por palavras soltas (todas precisam aparecer, qualquer ordem).
export function InsumoPicker({ insumos, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const termo = value.nome.trim();
  const tokens = normaliza(termo).split(/\s+/).filter(Boolean);
  const filtrados = (
    tokens.length
      ? insumos.filter((i) => {
          const nome = normaliza(i.nome);
          return tokens.every((t) => nome.includes(t));
        })
      : insumos
  ).slice(0, MAX_SUGESTOES);
  const temExato = insumos.some((i) => normaliza(i.nome) === normaliza(termo));

  return (
    <div className="relative">
      <input
        value={value.nome}
        onChange={(e) =>
          onChange({ insumoId: null, nome: e.target.value, unidade: "", isNew: false, estoqueMin: 0 })
        }
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Buscar ou criar insumo…"
        className={inputCls}
        aria-label="Insumo"
      />

      {open && (filtrados.length > 0 || (termo && !temExato)) && (
        <ul className="absolute left-0 z-20 mt-1 max-h-64 w-[min(24rem,calc(100vw-2.5rem))] min-w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg">
          {filtrados.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({
                    insumoId: i.id,
                    nome: i.nome,
                    unidade: i.unidade,
                    isNew: false,
                    estoqueMin: i.estoqueMin,
                  });
                  setOpen(false);
                }}
                className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none"
              >
                <span className="leading-snug text-foreground">{i.nome}</span>
                <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{i.unidade}</span>
              </button>
            </li>
          ))}

          {termo && !temExato && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({
                    insumoId: null,
                    nome: value.nome.trim(),
                    unidade: "",
                    isNew: true,
                    estoqueMin: 0,
                  });
                  setOpen(false);
                }}
                className="flex w-full items-start gap-1.5 border-t border-border px-3 py-2 text-left text-sm leading-snug text-foreground hover:bg-muted focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none"
              >
                <Plus className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>Criar “{value.nome.trim()}”</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
