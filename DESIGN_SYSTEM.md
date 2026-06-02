# Design System — Guia de UI para o Agente

> Documento de referência para construção de interfaces web modernas. Stack-alvo: **Next.js (App Router) + Tailwind CSS + shadcn/ui**. O agente deve seguir estes padrões em todo componente, página e tela gerados.
>
> **Fundamentado em:** Material Design 3 (m3.material.io), Design Tokens Community Group, IBM Carbon, e práticas de naming de tokens de Smashing Magazine / EightShapes. As convenções abaixo refletem os padrões oficiais desses sistemas, adaptados para a stack web acima.

---

## 0. Como o agente deve usar este documento

- Trate este arquivo como a **fonte de verdade** de UI. Em conflito entre uma instrução solta e este doc, **este doc vence**.
- **Nunca** use estética genérica de IA: gradiente roxo sobre fundo branco, fontes `Inter`/`Roboto`/`Arial`/`system-ui` como display, layouts previsíveis, grade simétrica de cards iguais sem intenção.
- Tudo sai de **design tokens** (CSS variables). Nada de cor, espaçamento ou raio hard-coded no JSX — esse é o princípio central de qualquer design system moderno: token único, mudança em um lugar, propagação global.
- Componha sempre a partir de **shadcn/ui**; estilize via tokens e Tailwind. Não reinvente botão, input, dialog.
- Todo componente: **acessível** (WCAG 2.1 AA) e **responsivo** (mobile-first).

---

## 1. Arquitetura de Tokens (três camadas)

Padrão consolidado dos sistemas maduros (Material 3, Carbon, Atlassian): tokens vivem em **três tiers**, e cada camada referencia a anterior — nunca um valor cru.

| Camada | Material 3 chama | Outros chamam | O que é | Exemplo |
|---|---|---|---|---|
| 1. Primitiva | `ref` (reference) | global / primitive | Valor cru, sem contexto. A paleta. | `--blue-500: 222 89% 55%` |
| 2. Semântica | `sys` (system) | alias / decision | Intenção/papel. Aponta para a primitiva e troca conforme o tema (light/dark). | `--primary: var(--blue-500)` |
| 3. Componente | component | component | Propriedade de um componente específico. Aponta para a semântica. | `--button-bg: var(--primary)` |

**Regras de ouro (do M3 e do DTCG):**
- Tokens de componente **sempre** apontam para semântica ou primitiva, nunca para hex/valor cru.
- Tokens semânticos descrevem o **porquê** (`color-text`, `color-danger`), não o **quê** (`red-500`). Se a marca mudar de azul, o nome semântico permanece; só o valor primitivo referenciado muda.
- Estabilize as primitivas primeiro; só depois anexe intenção. Pular direto pra nomes de componente trava decisões antes das escalas estarem maduras.
- Naming: kebab-case no CSS, camelCase no JS; comece pela categoria (`color-`, `space-`, `font-`); inclua estado/variante quando aplicável (`button-primary-hover`).

---

## 2. Tokens concretos (shadcn/ui + camadas)

Em `app/globals.css`. As **primitivas** alimentam as **semânticas**; o dark mode só remapeia a camada semântica.

```css
:root {
  /* ── Camada 1: Primitivas (cru, sem contexto) ── */
  --blue-500: 222 89% 55%;
  --blue-600: 222 89% 48%;
  --slate-50: 210 40% 98%;
  --slate-100: 210 40% 96%;
  --slate-500: 215 16% 47%;
  --slate-900: 222 47% 11%;
  --slate-950: 222 47% 6%;
  --red-500: 0 72% 51%;
  --white: 0 0% 100%;

  /* ── Camada 2: Semânticas (papel) — convenção shadcn/ui, HSL sem vírgulas ── */
  --background: var(--white);
  --foreground: var(--slate-900);
  --card: var(--white);
  --card-foreground: var(--slate-900);
  --popover: var(--white);
  --popover-foreground: var(--slate-900);
  --primary: var(--blue-500);
  --primary-foreground: var(--white);
  --secondary: var(--slate-100);
  --secondary-foreground: var(--slate-900);
  --muted: var(--slate-100);
  --muted-foreground: var(--slate-500);
  --accent: var(--slate-100);
  --accent-foreground: var(--slate-900);
  --destructive: var(--red-500);
  --destructive-foreground: var(--white);
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: var(--blue-500);
  --radius: 0.75rem;
}

.dark {
  /* só a camada semântica é remapeada — primitivas permanecem */
  --background: var(--slate-950);
  --foreground: var(--slate-50);
  --card: var(--slate-900);
  --card-foreground: var(--slate-50);
  --popover: var(--slate-900);
  --popover-foreground: var(--slate-50);
  --primary: var(--blue-600);
  --primary-foreground: var(--slate-950);
  --secondary: 217 33% 17%;
  --secondary-foreground: var(--slate-50);
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --accent: 217 33% 17%;
  --accent-foreground: var(--slate-50);
  --destructive: 0 62% 50%;
  --destructive-foreground: var(--slate-50);
  --border: 217 33% 20%;
  --input: 217 33% 20%;
  --ring: var(--blue-600);
}
```

### Espaçamento
Escala em múltiplos de 4px (Tailwind). Internos `4`/`6`; seções `12`/`16`/`24`; container `max-w-7xl` com `px-4 sm:px-6 lg:px-8`.

### Raio & Sombra
Raio deriva de `--radius`: `rounded-md` default, `rounded-lg` cards, `rounded-full` avatares/pills. Sombras em camadas suaves (`shadow-sm` repouso → `shadow-md`/`lg` elevação). Em dark mode a sombra some — use borda sutil para definir elevação.

---

## 3. Tipografia

Baseado nas recomendações de legibilidade do **Material Design 3**:
- **Line-height ~1.2×** o tamanho da fonte para estilos grandes (display, headline, title).
- **Line-height ~1.5×** para corpo e labels (body, label). Apertado demais quebra o fluxo; solto demais perde coesão.
- Use **algarismos tabulares** (monoespaçados) em tabelas, relógios e valores que mudam, para alinhamento ótico.
- Cor padrão do texto: `foreground`; texto secundário sempre `muted-foreground` (nunca cinza inventado).
- Links sobre superfície: cor `primary` **e sublinhados**.

### Fontes
- **Display/headings:** fonte com caráter — `Fraunces`, `Clash Display`, `Geist`, `Space Grotesk`, `General Sans`, `Satoshi`. **Evite Inter/Roboto/Arial como display.**
- **Body:** `Geist Sans`, `Public Sans`, `Source Sans 3`.
- Carregue via `next/font`; exponha `--font-display` e `--font-sans`; mapeie no `tailwind.config`.

### Escala (mobile → desktop)
| Papel | Uso | Classes | Line-height |
|---|---|---|---|
| Display | Hero | `text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight` | ~1.2 |
| H1 | Título de página | `text-3xl sm:text-4xl font-semibold tracking-tight` | ~1.2 |
| H2 | Seção | `text-2xl font-semibold tracking-tight` | ~1.2 |
| H3 | Subseção | `text-xl font-medium` | ~1.3 |
| Body | Texto | `text-base leading-relaxed` | ~1.5 |
| Small | Meta/legenda | `text-sm text-muted-foreground` | ~1.5 |
| Caption | Labels | `text-xs uppercase tracking-wide text-muted-foreground` | ~1.5 |

Texto longo: largura de leitura `max-w-prose` (~65ch).

---

## 4. Componentes (base shadcn/ui)

Sempre instalar e compor a partir destes:
- **Estrutura:** `Card`, `Separator`, `Sheet`, `Tabs`, `Accordion`, `ScrollArea`
- **Inputs:** `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Label`, `Form` (react-hook-form + zod)
- **Feedback:** `Dialog`, `AlertDialog`, `Sonner`(toast), `Tooltip`, `Skeleton`, `Badge`, `Progress`
- **Navegação:** `DropdownMenu`, `NavigationMenu`, `Breadcrumb`, `Command` (cmd+k), `Pagination`
- **Dados:** `Table` (+ TanStack Table), `Avatar`, `HoverCard`

### Botão
Variantes: `default` (primary), `secondary`, `outline`, `ghost`, `destructive`, `link`. Tamanhos: `sm`, `default`, `lg`, `icon`. **Um único CTA primário por tela/seção.**

### Estados obrigatórios (todo interativo)
`default · hover · focus-visible (ring) · active · disabled · loading · error`. Nunca remova o foco sem substituir por `ring`.

---

## 5. Layout & Composição

- **Mobile-first**; escale com `sm md lg xl 2xl`. M3 reforça design adaptativo — pense em telas que vão de phone a desktop.
- Grid de 12 colunas para conteúdo denso; `flex` para arranjos lineares.
- Container: `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8`.
- **Quebre a grade com intenção** (vazamento, sobreposição, assimetria) — para hierarquia, não decoração aleatória.
- Ritmo vertical: seções `py-16 lg:py-24`.
- **Estados vazio, loading e erro fazem parte do design** — sempre projete os três (`Skeleton` no loading; ilustração + ação no empty).

---

## 6. Cor & Tema

- `primary` para CTAs, links e foco — com parcimônia, para destacar.
- Neutros (`background`/`muted`/`border`) ocupam ~90% da tela.
- Semântica fixa: `destructive` para erro/perigo; defina `success`/`warning` como tokens extras se precisar — não invente verde/amarelo no JSX.
- **Contraste WCAG AA**: 4.5:1 texto normal, 3:1 texto grande/UI. (M3 e Carbon trazem AA como default.)
- **Dark mode é requisito.** Toggle via estratégia `class`; só a camada semântica troca.

---

## 7. Movimento

- Lib: **Motion (framer-motion)** em React; CSS puro quando der.
- Durações: micro-interações `150–200ms`; transições de layout `300–400ms`; entrada `ease-out`.
- **Page load:** reveal escalonado (`staggerChildren`) nos blocos principais.
- Press `scale 0.98`; hover com leve elevação.
- **Respeite `prefers-reduced-motion`**: desligue o não essencial. (Tendência M3 Expressive é movimento físico/natural — mas sempre acessível.)

---

## 8. Acessibilidade — WCAG 2.1 AA (não-negociável)

- HTML semântico (`<nav> <main> <header> <button>`; botão é `<button>`, não `<div onClick>`).
- Todo input com `<label>` associado; ícone-ação com `aria-label`.
- Foco sempre visível (`ring-2 ring-ring ring-offset-2`).
- Navegação completa por teclado; ordem de foco lógica; trap de foco em modais.
- `alt` descritivo; `alt=""` em decorativas.
- Contraste AA mínimo; não dependa só de cor para transmitir informação.

---

## 9. Estrutura de arquivos

```
app/
  (marketing)/            # rotas públicas
  (app)/                  # rotas autenticadas
  layout.tsx
  globals.css             # tokens (3 camadas) aqui
components/
  ui/                     # shadcn/ui (gerado)
  <feature>/              # componentes de domínio
lib/utils.ts              # cn(), helpers
hooks/
```

Convenções: PascalCase nos componentes; um por arquivo; `"use client"` só quando necessário; `cn()` para compor classes; nada de CSS inline solto.

---

## 10. Checklist antes de entregar qualquer tela

- [ ] Tokens em 3 camadas; sem valor cru no JSX
- [ ] Componentes vêm de shadcn/ui, não reinventados
- [ ] Tipografia segue a escala; line-height 1.2 (títulos) / 1.5 (corpo); display não é Inter/Roboto/Arial
- [ ] Light **e** dark (só camada semântica remapeia)
- [ ] Estados: hover, focus-visible, disabled, loading, empty, error
- [ ] Responsivo (mobile + desktop)
- [ ] WCAG AA: contraste, foco visível, teclado, não-só-cor
- [ ] Um CTA primário por tela
- [ ] `prefers-reduced-motion` respeitado
- [ ] Sem cara de "AI slop" genérico

---

## Fontes de referência (para aprofundar)

- **Material Design 3** — tokens, tipografia, cor, motion: `m3.material.io/foundations/design-tokens` e `m3.material.io/styles/typography`
- **Design Tokens Community Group** — spec de formato de tokens (JSON)
- **IBM Carbon** — modelo de três camadas e naming
- **shadcn/ui** — componentes base (`ui.shadcn.com`)
- **Tailwind CSS** — sistema utilitário (`tailwindcss.com`)
- **WCAG 2.1** — critérios de acessibilidade AA (`w3.org/WAI/WCAG21/quickref`)
