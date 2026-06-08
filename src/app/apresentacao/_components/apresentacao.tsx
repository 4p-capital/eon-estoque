"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  PackagePlus,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { LogoEon } from "@/app/_components/logo-eon";
import { cn } from "@/lib/utils";

const DOR_SOLUCAO: { dor: string; solucao: string }[] = [
  {
    dor: "Kit e insumo somem, sem rastro de quem, quando ou pra onde.",
    solucao: "QR único em cada kit: histórico completo, da produção à entrega.",
  },
  {
    dor: "Controle em planilha — o físico nunca bate com o papel.",
    solucao: "Livro-razão digital + inventário: físico × sistema conferido.",
  },
  {
    dor: "Material de cada obra (SPE) misturado — o custo se perde.",
    solucao: "Estoque e custo por SPE, com visão consolidada por empresa.",
  },
  {
    dor: "Ninguém sabe quantos kits dá pra produzir agora.",
    solucao: "Kits possíveis calculados em tempo real pela composição (BOM).",
  },
  {
    dor: "Nota fiscal digitada na mão, sem conferência.",
    solucao: "Entrada pela NF-e direto da SEFAZ: bipa, confere e converte a unidade.",
  },
  {
    dor: "Kit sai sem registro — e às vezes baixa duas vezes.",
    solucao: "Saída por QR: registra o destino e recusa baixa dupla.",
  },
];

const FLUXO: { icon: LucideIcon; passo: string; texto: string; marco?: "nasce" | "sai" }[] = [
  { icon: ScanLine, passo: "Entrada", texto: "A nota chega e o insumo entra no estoque da SPE." },
  { icon: Wrench, passo: "Tipos de kit", texto: "A receita (BOM): o que cada kit consome." },
  { icon: PackagePlus, passo: "Produção", texto: "Abre o lote e gera as etiquetas com QR.", marco: "nasce" },
  { icon: Boxes, passo: "Depósito", texto: "Bipa a entrada do kit pronto; baixa o BOM da SPE." },
  { icon: QrCode, passo: "Saída", texto: "Bipa o QR e expede a remessa pra obra.", marco: "sai" },
  { icon: ShieldCheck, passo: "Consulta", texto: "Qualquer um lê o QR e vê o histórico." },
];

// ── Slides ───────────────────────────────────────────────────────────────────
function Capa() {
  return (
    <Slide dark>
      <div className="text-center">
        <div className="inline-flex items-center gap-2">
          <LogoEon className="h-10 text-primary-foreground" />
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-primary-foreground/80">
            Produções
          </span>
        </div>
        <h1 className="font-heading mt-10 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Cada kit rastreado.
          <br />
          Cada insumo no lugar.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/85 sm:text-xl">
          Do recebimento da nota à saída do kit na obra — um sistema anti-furto que controla o
          estoque por empresa e por SPE, com QR em cada kit.
        </p>
        <div className="mt-9 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium">
          <Sparkles className="size-3.5" aria-hidden />
          Controle de Estoque · EON Produções
        </div>
      </div>
    </Slide>
  );
}

function DorResolve() {
  return (
    <Slide>
      <Eyebrow>O que trava o galpão hoje</Eyebrow>
      <Titulo>A dor de hoje, resolvida</Titulo>
      <div className="mt-7 grid gap-2.5">
        {DOR_SOLUCAO.map((item) => (
          <div
            key={item.dor}
            className="grid items-center gap-2 rounded-xl bg-card p-3.5 shadow-sm sm:grid-cols-2 sm:gap-5"
          >
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wide text-destructive">
                Dor
              </span>
              {item.dor}
            </p>
            <p className="flex items-start gap-2 border-t border-border/60 pt-2 text-sm font-medium text-foreground sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wide text-success">
                Resolve
              </span>
              {item.solucao}
            </p>
          </div>
        ))}
      </div>
    </Slide>
  );
}

function Fluxo() {
  return (
    <Slide>
      <Eyebrow>O caminho do kit</Eyebrow>
      <Titulo>Onde o kit nasce e onde sai</Titulo>
      <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FLUXO.map((etapa, i) => (
          <li key={etapa.passo} className="relative rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <etapa.icon className="size-5" aria-hidden />
              </span>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Passo {i + 1}
                </span>
                <p className="font-heading text-base font-bold text-foreground">{etapa.passo}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{etapa.texto}</p>
            {etapa.marco && (
              <span
                className={cn(
                  "absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  etapa.marco === "nasce"
                    ? "bg-primary/15 text-primary"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {etapa.marco === "nasce" ? "● nasce" : "● sai"}
              </span>
            )}
          </li>
        ))}
      </ol>
    </Slide>
  );
}

function Tenant() {
  return (
    <Slide>
      <Eyebrow>Pensado pra escalar</Eyebrow>
      <Titulo>De ferramenta interna a plataforma</Titulo>
      <div className="mt-8 grid gap-6 sm:grid-cols-[1.3fr_1fr] sm:items-center">
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            O sistema já <strong className="text-foreground">nasceu multi-empresa</strong>. Hoje
            opera a EON; amanhã, outras construtoras e indústrias — cada uma{" "}
            <strong className="text-foreground">100% isolada</strong> (estoque, fiscal, equipe).
          </p>
          <p>
            O galpão opera <strong className="text-foreground">todos os clientes no mesmo
            sistema</strong>, sem misturar dados nem custos. Cada empresa vê só o que é dela; o galpão
            enxerga a operação inteira.
          </p>
          <p className="font-medium text-foreground">
            O mesmo galpão que controla o estoque vira um produto que atende o mercado.
          </p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <Building2 className="size-7 text-primary" aria-hidden />
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2 text-foreground">
              <ClipboardCheck className="size-4 text-primary" aria-hidden /> Empresa → SPE → insumos e kits
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden /> Cofre fiscal privado por cliente
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <Boxes className="size-4 text-primary" aria-hidden /> Produção e estoque separados
            </li>
          </ul>
        </div>
      </div>
    </Slide>
  );
}

function Fechamento() {
  return (
    <Slide dark>
      <div className="text-center">
        <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">Pronto pra ver funcionando?</h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/85">
          A partir daqui é ao vivo — do insumo que entra ao kit que sai pela porta.
        </p>
        <Link
          href="/login"
          className="mt-9 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
        >
          Entrar no sistema
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Slide>
  );
}

const SLIDES = [Capa, DorResolve, Fluxo, Tenant, Fechamento];

// ── Deck ─────────────────────────────────────────────────────────────────────
export function Apresentacao() {
  const [i, setI] = useState(0);
  const total = SLIDES.length;
  const next = useCallback(() => setI((v) => Math.min(total - 1, v + 1)), [total]);
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const Atual = SLIDES[i];

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <div key={i} className="animate-fade-up h-full w-full">
        <Atual />
      </div>

      {/* Anterior / próximo */}
      <CircleBtn side="left" onClick={prev} disabled={i === 0} label="Slide anterior">
        <ChevronLeft className="size-5" aria-hidden />
      </CircleBtn>
      <CircleBtn side="right" onClick={next} disabled={i === total - 1} label="Próximo slide">
        <ChevronRight className="size-5" aria-hidden />
      </CircleBtn>

      {/* Bolinhas + contador */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setI(idx)}
            aria-label={`Ir para o slide ${idx + 1}`}
            aria-current={idx === i ? "true" : undefined}
            className={cn(
              "h-2 rounded-full transition-all",
              idx === i ? "w-6 bg-primary" : "w-2 bg-foreground/20 hover:bg-foreground/40",
            )}
          />
        ))}
      </div>
      <span className="absolute bottom-5 right-6 z-10 rounded-full bg-card px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground shadow-sm">
        {i + 1} / {total}
      </span>
    </div>
  );
}

function CircleBtn({
  side,
  onClick,
  disabled,
  label,
  children,
}: {
  side: "left" | "right";
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-0",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      {children}
    </button>
  );
}

function Slide({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-center overflow-y-auto px-6 py-16 sm:px-16",
        dark
          ? "bg-gradient-to-br from-primary to-indigo-700 text-primary-foreground"
          : "bg-background",
      )}
    >
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{children}</p>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
      {children}
    </h2>
  );
}
