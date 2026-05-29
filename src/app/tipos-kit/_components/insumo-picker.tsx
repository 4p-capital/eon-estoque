"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { inputCls } from "@/app/_components/form-styles";

export type InsumoOption = { id: string; nome: string; unidade: string };

export type LinhaInsumo = {
  insumoId: string | null;
  nome: string;
  unidade: string;
  isNew: boolean;
};

type Props = {
  insumos: InsumoOption[];
  value: LinhaInsumo;
  onChange: (v: LinhaInsumo) => void;
};

const MAX_SUGESTOES = 8;

// Campo "buscar ou criar": digita o nome, escolhe um insumo existente ou cria
// um novo inline. Reaproveita o insumo compartilhado (evita duplicado).
export function InsumoPicker({ insumos, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const termo = value.nome.trim().toLowerCase();
  const filtrados = termo
    ? insumos.filter((i) => i.nome.toLowerCase().includes(termo)).slice(0, MAX_SUGESTOES)
    : insumos.slice(0, MAX_SUGESTOES);
  const temExato = insumos.some((i) => i.nome.toLowerCase() === termo);

  return (
    <div className="relative">
      <input
        value={value.nome}
        onChange={(e) =>
          onChange({ insumoId: null, nome: e.target.value, unidade: "", isNew: false })
        }
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Buscar ou criar insumo…"
        className={inputCls}
        aria-label="Insumo"
      />

      {open && (filtrados.length > 0 || (termo && !temExato)) && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-bege-claro bg-white py-1 shadow-lg">
          {filtrados.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ insumoId: i.id, nome: i.nome, unidade: i.unidade, isNew: false });
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bege-claro/50"
              >
                <span className="text-preto">{i.nome}</span>
                <span className="text-xs text-cinza/50">{i.unidade}</span>
              </button>
            </li>
          ))}

          {termo && !temExato && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ insumoId: null, nome: value.nome.trim(), unidade: "", isNew: true });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-1.5 border-t border-bege-claro px-3 py-2 text-left text-sm text-preto hover:bg-bege-claro/50"
              >
                <Plus className="size-4 text-bege" aria-hidden />
                Criar “{value.nome.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
