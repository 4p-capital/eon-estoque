# eon-estoque — Guia de Desenvolvimento

> Sistema Inteligente de Controle de Estoque da **EON Instalações** (industrialização de
> kits para apartamentos). **Fonte da verdade** dos padrões — toda IA e dev humano lê antes de codar.
>
> Contexto de domínio: [`.claude/project-context.md`](.claude/project-context.md).

---

## 0. Regra de Ouro: Documentação Viva

**ANTES de codar:** `Grep`/`Glob` antes de `Write` — verifique o que já existe (componentes, libs, funções SQL).

**DEPOIS:** se criou um padrão reutilizável ou componente compartilhado, atualize este arquivo.

> Se um padrão documentado parecer desatualizado, **valide contra o código antes de confiar** — depois corrija a doc.

---

## 1. ⚠️ Next.js 16 — não é o Next que você "conhece"

Esta versão tem breaking changes em relação a dados de treino. **Antes de escrever código Next**, consulte os docs versionados em `node_modules/next/dist/docs/`. Pontos que já mordem:

- `params` e `searchParams` são **`Promise`** → `const { id } = await params`.
- `cookies()` e `headers()` (de `next/headers`) são **assíncronos** → `await cookies()`.
- O convention `middleware` foi **renomeado para `proxy`** → usamos [`src/proxy.ts`](src/proxy.ts) exportando `proxy`.
- Client Component **não pode ser `async`**; props passadas Server→Client precisam ser serializáveis.

---

## 2. Setup rápido

```bash
pnpm install
cp .env.example .env.local        # preencher NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
pnpm dev                          # http://localhost:3000 → /dashboard
```

Banco (Supabase):

```bash
supabase start                    # Postgres + Auth + Studio local (precisa Docker)
supabase db reset                 # aplica migrations + roda seed.sql
supabase functions serve          # Edge Functions local
# nuvem: supabase link --project-ref <ref> → supabase db push → supabase functions deploy
```

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5.9 · Tailwind v4 · Supabase (Postgres, Auth, Edge Functions Deno) · pnpm. **App único — NÃO é monorepo.**

**Estrutura:**
- `src/app/` — rotas (App Router). `src/lib/supabase/` — clients browser/server + sessão. `src/lib/types.ts` — tipos do domínio.
- `supabase/migrations/` — schema + funções SQL. `supabase/functions/` — Edge Functions. `supabase/seed.sql` — dados de exemplo.
- `.claude/skills/` — skills de boas práticas (Next, Supabase, Postgres, shadcn, React, design).

---

## 3. Naming (OBRIGATÓRIO)

| Camada | Convenção | Idioma | Exemplo |
|---|---|---|---|
| Tabelas/colunas Postgres | `snake_case` | Inglês* | `unidade_kit`, `created_at` |
| Funções/RPC SQL | `snake_case` | Português OK (domínio) | `produzir_lote`, `calcular_kits_possiveis` |
| TS types/interfaces | `PascalCase` | Inglês | `KitPossivel` |
| Variáveis/funções TS | `camelCase` | Inglês | `getKitsPossiveis()` |
| Rotas API | `kebab-case` | Inglês | `/api/kits-possiveis` |
| Pastas de rotas (UI) | `kebab-case` | Português OK | `producao/`, `dashboard/` |
| Labels/textos UI | natural | **Português** | "Produzir lote" |
| `localStorage` keys | `eon_*` | Inglês | `eon_local_ativo` |

\* O domínio é PT-BR, então nomes de negócio em português no banco são aceitáveis e já usados (`insumo`, `lote`, `empreendimento`). Mantenha consistência com o que já existe.

---

## 4. Banco e migrations (OBRIGATÓRIO)

- **Pasta canônica:** `supabase/migrations/`. Nunca invente nome — crie com `supabase migration new <desc>` (timestamp correto).
- **Nome:** `YYYYMMDDHHMMSS_descricao_curta.sql`.
- **RLS sempre ligada** em toda tabela. Hoje a policy é `authenticated all` (evoluir para papéis depois — ver §7).
- **Views com `security_invoker = true`** — sem isso a view roda como dono e **fura a RLS**.
- **Índices em foreign keys** — Postgres NÃO indexa FK automaticamente; crie índice em toda FK usada em join/filtro.
- **Saldo = soma das movimentações** (livro-razão `movimentacao`). Não guarde saldo materializado sem motivo.
- **Operações multi-passo são atômicas** em função `plpgsql` (ex.: `produzir_lote` baixa BOM + cria unidades + gera QR numa transação).
- **Iterar local com `execute_sql`/`db query`; só gerar a migration quando estável.** Não use `apply_migration` a cada passo.
- Validar schema rodando do zero: `supabase db reset`. Rodar `supabase db advisors` antes de commitar.

---

## 5. Convenções de código

### 5.1 Limites rígidos

| Item | Limite | Ao passar |
|---|---|---|
| Arquivo `.tsx`/`.ts` | 300 linhas | Extrair subcomponente/hook |
| `page.tsx` | 100 linhas | Mover lógica para `_components/` |
| `route.ts` | 150 linhas | Mover lógica para `src/lib/<dominio>/` |
| Função | 50 linhas | Quebrar |
| Parâmetros | 4 | Use objeto |
| Aninhamento | 3 níveis | Early return / guard clause |
| Migration `.sql` | 500 linhas | Quebrar em sequenciais |

### 5.2 TypeScript

- **Sem `any`.** Use `unknown` + narrow com Zod/type guard. Se precisar mesmo, comente o porquê.
- **Sem `@ts-ignore`/`@ts-expect-error`** sem comentário explicando motivo e prazo.
- **`import type`** para imports só de tipo. Funções públicas com retorno explícito.
- **Discriminated unions** > booleans + optionals.
- **Sem `enum`** — use `as const` + union: `const STATUS = ["em_estoque","expedido"] as const; type Status = typeof STATUS[number];`.
- `strict: true` obrigatório. Tipos do banco: `supabase gen types typescript` → `src/lib/database.types.ts`.

### 5.3 Estilo

- **Early return / guard clauses** — saia cedo, evite aninhamento.
- **Regra de 3 (DRY):** abstraia na 3ª duplicação, não antes.
- **Magic numbers/strings → constantes nomeadas** no topo.
- **Booleans:** prefixe com `is`/`has`/`should`/`can`. **Funções:** verbo + substantivo.
- **Sem `else` depois de `return`.** Sem código morto comentado. Sem `catch {}` vazio.
- **Imports ordenados:** built-ins → externos → `@/...` → relativos.
- **Sem `console.log` solto** — `console.error("[Modulo] msg", err)`.

### 5.4 Error handling

- Server (Server Actions / Route Handlers / Edge Functions): logue com namespace, retorne mensagem **genérica em PT-BR** (nunca `error.message` cru no client).
- Client: `toast.error()`. **Nunca `alert()`/`confirm()`** — use um `<ConfirmDialog>`.
- Fluxos críticos (baixa de estoque, saída de kit): a função SQL valida e lança exceção clara (ex.: "Insumo insuficiente…").

### 5.5 Acessibilidade

- Clicável → `<button>`/`<a>`, nunca `<div onClick>`.
- `<Label htmlFor>` ou `aria-label` em inputs. `alt` em imagens (decorativas: `alt=""`).
- Foco visível: não remova `outline` sem `:focus-visible`. Teste com teclado (Tab/Enter/Esc).

### 5.6 Supabase no client

- `@supabase/ssr`: client de browser e de servidor em `src/lib/supabase/` — use o correto pro contexto.
- **Nunca** exponha `service_role` no client (qualquer `NEXT_PUBLIC_*` vai pro browser).
- Autorização nunca via `user_metadata` (editável pelo usuário) → use `app_metadata`.

### 5.7 Design — identidade visual (EON)

- **Minimalista e clean**: fundo branco, hierarquia por tipografia, pouca cromia.
- **Paleta oficial** em tokens (`globals.css` `@theme`): `preto` `#000` (títulos/ação primária), `cinza` `#404040` (texto/ícones), `bege` `#BCAB8F` (eyebrows/tags/foco — **não** como texto pequeno no branco, contraste baixo), `bege-claro` `#EEEAE3` (bordas/fundos sutis), branco no fundo. Use os utilitários `bg-preto`/`text-cinza`/`border-bege-claro`…
- **Cor funcional** (vermelho p/ alerta de compra/saldo baixo) só quando comunica algo real — não decore.
- **Logo:** componente [`LogoEon`](src/app/_components/logo-eon.tsx) (`currentColor`), nunca o `.svg` branco direto no fundo claro (ficaria invisível).
- **Light-first:** `dark:` é opt-in por classe `.dark` (`@custom-variant` no globals). Detalhes em [`.claude/project-context.md`](.claude/project-context.md).

---

## 6. Forms (padrão a adotar quando criarmos as telas)

> Ainda não temos esses componentes; ao construir os primeiros forms, siga esta direção (skill `shadcn` ajuda):

- **Validação:** react-hook-form + Zod.
- Forms com 2+ seções → componente wizard com passos e % de completude.
- Selects com muitas opções → componente de busca (não `<Select>` cru para >3 opções).
- Sempre cheque `src/components/ui/` antes de criar componente novo.

---

## 7. Auth / permissões (evoluir depois)

Hoje: RLS `authenticated all` (qualquer logado lê/escreve). O sistema é **anti-furto**, então a evolução natural é papéis (quem dá entrada vs. saída vs. admin). Quando chegar a hora:

- Validar autenticação **no servidor** em toda mutação (Server Action / Edge Function), nunca só no client.
- Guardar dados de autorização em `app_metadata`, não `user_metadata`.
- RLS performática: envolver `auth.uid()` em subquery escalar — `using ((select auth.uid()) = …)`.

---

## 8. Antes de marcar tarefa como pronta

**Quando rodar:** só no **fim do pedido inteiro**, depois que o usuário parou de iterar. **Não** rode entre subtarefas nem entre rodadas de feedback.

```bash
pnpm exec tsc --noEmit    # zero erros de tipo
pnpm lint                 # zero erros (warnings ok)
pnpm build                # compila
```

- Mudança de **UI**: rode `pnpm dev`, abra no browser, teste o golden path **e** o caso de erro (sem permissão, sem dados, dado inválido). Type-check ≠ feature funcionando.
- Mudança de **schema**: confirme que roda do zero (`supabase db reset`) e rode `supabase db advisors`.

---

## 9. Anti-patterns

- ❌ Tabela sem RLS → ✅ `enable row level security` + policy.
- ❌ View sem `security_invoker = true` → ✅ sempre com.
- ❌ FK sem índice → ✅ índice em toda FK de join/filtro.
- ❌ `service_role` no client / autorização via `user_metadata` → ✅ servidor + `app_metadata`.
- ❌ Saldo de estoque calculado/baixado só no client → ✅ função SQL atômica no servidor.
- ❌ `any`/`@ts-ignore` sem comentário → ✅ `unknown` + Zod.
- ❌ `enum` → ✅ `as const` + union.
- ❌ `<div onClick>` → ✅ `<button>`/`<a>`. ❌ `alert()`/`confirm()` → ✅ `toast` + `<ConfirmDialog>`.
- ❌ Magic numbers, código comentado, `else` após `return`, `catch {}` vazio.
- ❌ Criar componente sem checar `src/components/ui/` antes.
- ❌ Inventar nome de migration → ✅ `supabase migration new`.
- ❌ `cookies()`/`params` sem `await` (Next 16) · `middleware.ts` (virou `proxy.ts`).

---

## 10. Quando perguntar antes de prosseguir

- Drop/rename de coluna ou tabela existente.
- Mudança em policies RLS, no `proxy.ts` ou nos clients Supabase.
- Adicionar dependência grande (ORM, framework UI).
- Refatorar em massa arquivos >300 linhas.
- Apagar arquivos não listados explicitamente.
- Qualquer ambiguidade entre o pedido e o estado atual do código.

---

## 11. Commits e branches

Mensagens em **inglês, imperativo, `type(scope): description`**.

Tipos: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`, `perf`.
Exemplos: `feat(producao): add lote production screen`, `fix(estoque): prevent negative balance`.

Branches: `feat/<desc>`, `fix/<desc>`, `chore/<desc>`, `refactor/<desc>`.

---

## 12. Documentação relacionada

- [README.md](README.md) — visão do produto e setup.
- [.claude/project-context.md](.claude/project-context.md) — contexto de domínio (grounding dos skills).
- `.claude/skills/` — boas práticas de Next, Supabase, Postgres, shadcn, React e design.
