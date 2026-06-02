"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { inputCls, labelCls } from "@/app/_components/form-styles";
import { parseChave } from "@/lib/fiscal/chave";
import { formatarCnpj } from "@/lib/fiscal/format";
import type { ItemConferencia, NotaConferencia } from "@/lib/fiscal/types";
import type { InsumoOption } from "@/app/tipos-kit/_components/insumo-picker";
import { ConferenciaNota } from "@/app/entrada/_components/conferencia-nota";

type TentativaApi = { spe: string; cStat: string | null; xMotivo: string | null; erro?: string };
type RespostaApi = {
  ok: boolean;
  encontrado?: boolean;
  message?: string;
  nota?: NotaConferencia;
  itens?: ItemConferencia[];
  tentativas?: TentativaApi[];
};

export function LeitorEntrada({ insumos }: { insumos: InsumoOption[] }) {
  const [bruto, setBruto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<RespostaApi | null>(null);

  const info = parseChave(bruto);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    if (!info) {
      toast.error("Leia ou digite uma chave de acesso de 44 dígitos.");
      return;
    }
    setCarregando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/fiscal/consultar-nota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave: info.chave }),
      });
      const data = (await res.json()) as RespostaApi;
      setResultado(data);
      if (!res.ok || !data.ok) {
        toast.error(data.message ?? "Não foi possível consultar a nota.");
      } else if (!data.encontrado) {
        toast.warning("Conexão OK, mas o XML não veio. Veja o diagnóstico abaixo.");
      }
    } catch (err) {
      console.error("[entrada] consultar", err);
      toast.error("Erro de rede ao consultar a SEFAZ.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={consultar} className="space-y-4">
        <div>
          <label htmlFor="chave" className={labelCls}>
            Código de barras / chave de acesso
          </label>
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="chave"
              name="chave"
              value={bruto}
              onChange={(e) => setBruto(e.target.value)}
              autoFocus
              autoComplete="off"
              inputMode="numeric"
              placeholder="Bipe o código de barras da DANFE…"
              className={`${inputCls} pl-9 font-mono`}
            />
          </div>
          {bruto && !info && <p className="mt-1.5 text-xs text-destructive">Ainda não são 44 dígitos válidos.</p>}
          {info && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Emitente {formatarCnpj(info.cnpjEmitente)} · nota nº {Number(info.numero)} · série {Number(info.serie)}
            </p>
          )}
        </div>

        <Button type="submit" disabled={carregando || !info} className="w-full">
          {carregando && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Consultar nota na SEFAZ
        </Button>
      </form>

      {resultado?.encontrado && resultado.nota && resultado.itens && (
        <ConferenciaNota nota={resultado.nota} itens={resultado.itens} insumos={insumos} />
      )}

      {resultado && !resultado.encontrado && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
          <p className="font-medium">{resultado.message ?? "Nota não retornada."}</p>
          {resultado.tentativas && resultado.tentativas.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {resultado.tentativas.map((t, i) => (
                <li key={i}>
                  <span className="font-medium">{t.spe}:</span>{" "}
                  {t.erro ? `erro — ${t.erro}` : `cStat ${t.cStat ?? "?"} — ${t.xMotivo ?? "—"}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
