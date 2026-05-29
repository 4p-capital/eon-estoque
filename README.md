# Sistema Inteligente de Controle de Estoque — EON Instalações

Controle de estoque para a industrialização de kits (elétrico, hidráulico…) usados
na construção dos apartamentos. O sistema gira em torno da relação
**insumo → kit → empreendimento**, derivada da ata de reunião.

## O que ele faz

- **Kits possíveis**: calcula quantos kits dá para montar agora, apontando o
  _insumo gargalo_ (o que acaba primeiro).
- **Ponto de pedido**: alerta de compra quando o saldo cruza
  `consumo_dia × lead_time + estoque_segurança` — nem comprar cedo demais, nem faltar.
- **Produção de lote**: registra "produzi X kits", baixa os insumos pelo BOM
  automaticamente e gera um **QR único por kit**.
- **Saída por QR**: bipa o kit na saída, registra quem/quando/destino e recusa baixa dupla.
- **De-Para de fornecedor**: mapeia o nome/EAN do fornecedor para o insumo interno
  (resolve nota impressa/OCR).

## Stack

| Camada     | Tecnologia                                  |
| ---------- | ------------------------------------------- |
| Frontend   | Next.js 16 + React 19 + Tailwind CSS 4      |
| Backend    | Supabase — Postgres, Auth, Edge Functions   |
| Lógica     | Funções SQL (atômicas) + Edge Functions (Deno) |

## Estrutura

```
eon-estoque/
├── src/
│   ├── app/dashboard/        # tela de kits possíveis + ponto de pedido
│   ├── lib/supabase/         # clients (browser/server) + middleware de sessão
│   └── lib/types.ts          # tipos do domínio
└── supabase/
    ├── migrations/
    │   ├── ..._schema_inicial.sql     # tabelas, views, RLS
    │   └── ..._funcoes_estoque.sql    # inteligência + funções transacionais
    ├── functions/            # Edge Functions
    │   ├── kits-possiveis/
    │   ├── ponto-de-pedido/
    │   ├── produzir-lote/
    │   └── registrar-saida/
    └── seed.sql              # dados de exemplo (cenário da reunião)
```

## Modelo de dados (resumo)

`TIPO_KIT` (receita/BOM) → `LOTE` (produção ligada a um `EMPREENDIMENTO`) →
`UNIDADE_KIT` (cada kit físico, com `qr_code`). `INSUMO` + `COMPOSICAO` (BOM) e
`MOVIMENTACAO` (livro-razão: saldo = soma das movimentações). `DE_PARA_FORNECEDOR`
liga descrições/EAN do fornecedor ao insumo interno.

## Como rodar

### 1. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com a URL e a anon key do Supabase (local ou nuvem).

### 2. Banco de dados

**Local (Docker):**

```bash
supabase start          # sobe Postgres + Auth + Studio; imprime URL/anon key
supabase db reset       # aplica as migrations + roda o seed.sql
```

**Nuvem:** conecte um projeto (`supabase link --project-ref <ref>`) e rode
`supabase db push`. As Edge Functions sobem com `supabase functions deploy`.

### 3. Frontend

```bash
pnpm install
pnpm dev                # http://localhost:3000  -> redireciona para /dashboard
```

## Cenário do seed

Estoque inicial: fio 4.500 m, disjuntor 380 un, caixa 900 un. Kit elétrico = 10 m
fio + 1 disjuntor + 2 caixas → **380 kits possíveis** (gargalo: disjuntor).

## Próximos passos sugeridos

- Telas de produção (gera os QRs do lote para impressão) e de bipagem na saída.
- Importação de NF-e (XML via chave de acesso; OCR como fallback com conferência).
- Geração de tipos: `supabase gen types typescript --local > src/lib/database.types.ts`.
- Autenticação (telas de login usando Supabase Auth).
