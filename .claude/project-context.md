# Contexto do Projeto — eon-estoque

*Sistema Inteligente de Controle de Estoque — EON Instalações*

> Este documento ancora os skills e o trabalho do agente no domínio do projeto.
> (Substituiu o `product-marketing-context.md` do projeto de origem, OctaBuild/Octalab,
> que não se aplica aqui.)

## O que é

Controle de estoque para a **industrialização de kits** (elétrico, hidráulico…) usados
na construção de apartamentos do Minha Casa Minha Vida. O sistema gira em torno da
relação **insumo → kit → empreendimento**.

Antes era controlado por planilha; o objetivo é um sistema que calcula sozinho a
capacidade de produção e o momento de comprar, com rastreabilidade por QR para
combater furto.

## Conceitos centrais do domínio

- **Insumo**: matéria-prima (fio, disjuntor, caixa) com unidade de medida.
- **Tipo de kit**: a "receita" (BOM) — quanto de cada insumo um kit consome.
- **Lote**: uma rodada de produção ligada a um empreendimento.
- **Unidade de kit**: cada kit físico, com QR único (rastreio na saída).
- **Kits possíveis**: quantos kits dá para montar agora (limitado pelo insumo gargalo).
- **Ponto de pedido**: `consumo_dia × lead_time + estoque_segurança` → alerta de compra.
- **Movimentação**: livro-razão; saldo = soma das movimentações.

## Stack

| Camada   | Tecnologia                                              |
| -------- | ------------------------------------------------------- |
| Frontend | Next.js **16** (App Router) + React **19** + Tailwind 4 |
| Backend  | **Supabase** — Postgres, Auth, Edge Functions (Deno)    |
| Lógica   | Funções SQL atômicas + Edge Functions; views com RLS    |
| Gerência | **pnpm** (app único, **não** é monorepo)                |

## Convenções e cuidados (importante para os skills)

- **Next.js 16**: `params`/`searchParams` e `cookies()` são **assíncronos** (`await`).
  O convention de middleware foi renomeado para **`proxy`** (`src/proxy.ts`).
- **Supabase no client**: usar `@supabase/ssr` (browser/server clients em
  `src/lib/supabase/`). Nunca expor `service_role` no client.
- **RLS sempre ligada**; views criadas com `security_invoker = true`.
- **Lógica de estoque no servidor**: validar baixa/produção em funções SQL ou Server
  Actions — nunca confiar só no client (é um sistema anti-furto).
- **Idioma**: domínio e comentários em português; identificadores de código em
  inglês/snake_case no banco.

## Identidade visual / Design (EON)

O sistema usa um design **minimalista e clean**: muito espaço em branco, hierarquia
por tipografia (não por cor), pouca cromia. **Fundo branco predominante**; preto e
cinza para textos; **bege** apenas em detalhes minimalistas (eyebrows, tags, fundos
sutis, ícones, bordas). Cores funcionais (vermelho para "precisa comprar"/saldo
baixo) são exceção e só aparecem quando comunicam um alerta real.

**Paleta oficial** (tokens em [`src/app/globals.css`](../../src/app/globals.css), via
`@theme` → geram utilitários `bg-*`/`text-*`/`border-*`):

| Token | Hex | Uso |
|---|---|---|
| `preto` | `#000000` | títulos, ação primária (botões), texto forte |
| `cinza` | `#404040` | texto corrido, ícones, secundários (`text-cinza/60` etc.) |
| `bege` | `#BCAB8F` | eyebrows/labels, destaque de tag, borda de foco. **Não usar como texto pequeno no branco** (contraste baixo — §5.5) |
| `bege-claro` | `#EEEAE3` | bordas, divisórias, fundos sutis, tags minimalistas |
| `background` | `#FFFFFF` | fundo |

**Logo:** [`public/logo-eon.svg`](../../public/logo-eon.svg) é **branca** (feita p/ fundo
escuro). Use o componente [`LogoEon`](../../src/app/_components/logo-eon.tsx), que in-lina
a SVG com `fill="currentColor"` → fica preta no fundo claro e branca quando o container
é escuro (ex.: painel do login). Nunca referencie o `.svg` direto via `<img>` no claro
(ficaria invisível).

**Light-first:** o `dark:` do Tailwind é opt-in por classe `.dark` (ver `@custom-variant`
no globals); sem `.dark` no `<html>`, o app é sempre claro.

## Skills aplicáveis a este projeto

`next-best-practices`, `next-cache-components`, `supabase`,
`supabase-postgres-best-practices`, `shadcn`, `vercel-react-best-practices`,
`vercel-composition-patterns`, `frontend-design`, `web-design-guidelines`, `pdf`,
`find-skills`.

Skills de marketing, React Native e Turborepo foram **removidos** por não se
aplicarem a este projeto (ver relatório de adaptação).
