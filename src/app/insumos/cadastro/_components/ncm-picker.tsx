"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/app/_components/form-styles";
import { Tag } from "@/components/ui/tag";

type NcmOpcao = { codigo: string; codigo_formatado: string; descricao_completa: string };

const MIN_BUSCA = 2;
const LIMITE = 20;
const DEBOUNCE_MS = 250;

// Sanitiza o termo para o filtro `.or()` do PostgREST (vírgula/parênteses quebram a sintaxe).
function limpaTermo(texto: string): string {
  return texto.replace(/[(),]/g, " ").trim();
}

// Campo de busca de NCM no cadastro de insumo: digita código ou descrição, busca
// na base oficial (estoque.ncm, nível 4 = item de 8 dígitos) e grava o código
// selecionado num hidden `name="ncm"`. Opcional — pode ficar vazio.
export function NcmPicker({ defaultCodigo }: { defaultCodigo?: string | null }) {
  const supabase = useRef(createClient());
  const [selecionado, setSelecionado] = useState<NcmOpcao | null>(null);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<NcmOpcao[]>([]);
  const [open, setOpen] = useState(false);

  // Carrega a opção inicial (edição) para exibir código + descrição legível.
  useEffect(() => {
    if (!defaultCodigo) return;
    let ativo = true;
    supabase.current
      .from("ncm")
      .select("codigo, codigo_formatado, descricao_completa")
      .eq("codigo", defaultCodigo)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo && data) setSelecionado(data);
      });
    return () => {
      ativo = false;
    };
  }, [defaultCodigo]);

  // Busca debounced por código (dígitos) ou descrição. O setState mora dentro do
  // callback do timeout (não no corpo do effect) — evita render em cascata.
  useEffect(() => {
    const t = limpaTermo(termo);
    const id = setTimeout(async () => {
      if (t.length < MIN_BUSCA) {
        setResultados([]);
        return;
      }
      const digitos = t.replace(/\D/g, "");
      const filtros = [`descricao_completa.ilike.%${t}%`];
      if (digitos.length >= MIN_BUSCA) filtros.unshift(`codigo.ilike.%${digitos}%`);

      const { data, error } = await supabase.current
        .from("ncm")
        .select("codigo, codigo_formatado, descricao_completa")
        .eq("nivel", 4)
        .or(filtros.join(","))
        .limit(LIMITE);
      if (!error) setResultados(data ?? []);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [termo]);

  function escolher(op: NcmOpcao) {
    setSelecionado(op);
    setTermo("");
    setResultados([]);
    setOpen(false);
  }

  function limpar() {
    setSelecionado(null);
    setTermo("");
  }

  return (
    <div>
      <input type="hidden" name="ncm" value={selecionado?.codigo ?? ""} />

      {selecionado ? (
        <div className="flex items-start justify-between gap-2 rounded-md border border-input bg-background px-3 py-2">
          <div className="min-w-0">
            <Tag color="blue">{selecionado.codigo_formatado}</Tag>
            <p className="mt-1 truncate text-xs text-muted-foreground" title={selecionado.descricao_completa}>
              {selecionado.descricao_completa}
            </p>
          </div>
          <button
            type="button"
            onClick={limpar}
            aria-label="Remover NCM"
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="Buscar NCM por código ou descrição…"
            className={inputCls}
            aria-label="NCM"
          />
          {open && resultados.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-lg">
              {resultados.map((op) => (
                <li key={op.codigo}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => escolher(op)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none"
                  >
                    <span className="font-mono text-xs text-foreground">{op.codigo_formatado}</span>
                    <span className="truncate text-xs text-muted-foreground">{op.descricao_completa}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
