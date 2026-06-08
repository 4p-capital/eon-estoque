import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
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

// Dor do galpão hoje -> como o sistema resolve. Pareado pra leitura rápida.
const DOR_SOLUCAO: { dor: string; solucao: string }[] = [
  {
    dor: "Kit e insumo somem — sem rastro de quem, quando ou pra onde.",
    solucao: "QR único em cada kit: histórico completo, da produção à entrega.",
  },
  {
    dor: "Controle em planilha — o físico nunca bate com o papel.",
    solucao: "Livro-razão digital + inventário: físico × sistema sempre conferido.",
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

// O fluxo: onde o kit nasce e onde encerra, passando pelos módulos.
const FLUXO: { icon: LucideIcon; passo: string; texto: string; marco?: "nasce" | "sai" }[] = [
  { icon: ScanLine, passo: "Entrada", texto: "A nota chega e o insumo entra no estoque da SPE." },
  { icon: Wrench, passo: "Tipos de kit", texto: "A receita (BOM): quais insumos cada kit consome." },
  {
    icon: PackagePlus,
    passo: "Produção",
    texto: "Abre o lote e gera as etiquetas com QR.",
    marco: "nasce",
  },
  {
    icon: Boxes,
    passo: "Depósito",
    texto: "Bipa a entrada do kit pronto e baixa o BOM da SPE.",
  },
  {
    icon: QrCode,
    passo: "Saída",
    texto: "Bipa o QR e expede a remessa pra obra.",
    marco: "sai",
  },
  {
    icon: ShieldCheck,
    passo: "Consulta",
    texto: "Qualquer um lê o QR e vê o histórico do kit.",
  },
];

export function Apresentacao() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-indigo-700 px-6 py-20 text-primary-foreground sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto inline-flex items-center gap-2">
            <LogoEon className="h-9 text-primary-foreground" />
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-primary-foreground/80">
              Produções
            </span>
          </div>
          <h1 className="font-heading mt-8 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Cada kit rastreado.
            <br />
            Cada insumo no lugar.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
            Do recebimento da nota à saída do kit na obra — um sistema anti-furto que controla o
            estoque por empresa e por SPE, com QR em cada kit.
          </p>
          <div className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium">
            <Sparkles className="size-3.5" aria-hidden />
            Controle de Estoque · EON Produções
          </div>
        </div>
      </section>

      {/* Dor -> solução */}
      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <Eyebrow>O que trava o galpão hoje</Eyebrow>
          <Titulo>A dor de hoje, resolvida</Titulo>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cada problema do dia a dia tem uma resposta direta no sistema.
          </p>

          <div className="mt-8 space-y-3">
            {DOR_SOLUCAO.map((item) => (
              <div
                key={item.dor}
                className="grid gap-3 rounded-xl bg-card p-4 shadow-sm sm:grid-cols-2 sm:gap-6 sm:p-5"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 text-xs font-bold uppercase tracking-wide text-destructive">
                    Dor
                  </span>
                  <p className="text-sm text-muted-foreground">{item.dor}</p>
                </div>
                <div className="flex items-start gap-2.5 border-t border-border/60 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  <span className="mt-0.5 shrink-0 text-xs font-bold uppercase tracking-wide text-success">
                    Resolve
                  </span>
                  <p className="text-sm font-medium text-foreground">{item.solucao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fluxo */}
      <section className="bg-card px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <Eyebrow>O caminho do kit</Eyebrow>
          <Titulo>Onde o kit nasce e onde sai</Titulo>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Um único fluxo conecta os módulos — do insumo que chega ao kit que sai pra obra.
          </p>

          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FLUXO.map((etapa, i) => (
              <li
                key={etapa.passo}
                className="relative rounded-xl border border-border bg-background p-5"
              >
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
                    className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      etapa.marco === "nasce"
                        ? "bg-primary/15 text-primary"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {etapa.marco === "nasce" ? "● nasce" : "● sai"}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* A jogada do tenant */}
      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <Eyebrow>Pensado pra escalar</Eyebrow>
          <Titulo>De ferramenta interna a plataforma</Titulo>

          <div className="mt-8 grid gap-6 sm:grid-cols-[1.3fr_1fr] sm:items-center">
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                O sistema já <span className="font-semibold text-foreground">nasceu multi-empresa</span>.
                Hoje opera a EON; amanhã, outras construtoras e indústrias — cada uma{" "}
                <span className="font-semibold text-foreground">100% isolada</span> (estoque, fiscal,
                equipe).
              </p>
              <p>
                O galpão opera <span className="font-semibold text-foreground">todos os clientes no
                mesmo sistema</span>, sem misturar dados nem custos. Cada empresa vê só o que é dela; o
                galpão enxerga a operação inteira.
              </p>
              <p className="font-medium text-foreground">
                O mesmo galpão que controla o estoque vira um produto que atende o mercado.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <Building2 className="size-7 text-primary" aria-hidden />
              <ul className="mt-4 space-y-2.5 text-sm">
                <li className="flex items-center gap-2 text-foreground">
                  <ClipboardCheck className="size-4 text-primary" aria-hidden /> Empresa → SPE → insumos e
                  kits
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="size-4 text-primary" aria-hidden /> Cofre fiscal privado por
                  cliente
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <Boxes className="size-4 text-primary" aria-hidden /> Produção e estoque separados
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Fechamento */}
      <section className="bg-gradient-to-br from-primary to-indigo-700 px-6 py-16 text-center text-primary-foreground sm:py-20">
        <h2 className="font-heading text-2xl font-extrabold sm:text-3xl">
          Pronto pra ver funcionando?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/85">
          A partir daqui é ao vivo — do insumo que entra ao kit que sai pela porta.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
        >
          Entrar no sistema
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <p className="mt-10 text-xs text-primary-foreground/60">
          EON Produções · Controle de Estoque
        </p>
      </section>
    </main>
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
