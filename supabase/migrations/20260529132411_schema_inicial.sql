-- ============================================================================
-- Sistema Inteligente de Controle de Estoque — EON Instalações
-- Schema inicial: insumo -> kit -> empreendimento
--
-- Tudo vive no schema `estoque` (projeto Supabase compartilhado com o domínio
-- de notificação, que mora no schema public). Isolar em schema próprio dá
-- separação visual no Studio e fronteira limpa entre os dois sistemas.
--
-- Modelo derivado da ata de reunião:
--   TIPO_KIT (receita/BOM)  ->  LOTE (produção ligada a um empreendimento)
--   -> UNIDADE_KIT (cada kit físico, com QR único)
--   INSUMO + COMPOSICAO (BOM) + MOVIMENTACAO (livro-razão) + EMPREENDIMENTO
--   DE_PARA_FORNECEDOR (resolve nome do fornecedor/EAN -> insumo interno)
-- ============================================================================

create extension if not exists "pgcrypto";

create schema if not exists estoque;

-- ---------------------------------------------------------------------------
-- Cadastros básicos
-- ---------------------------------------------------------------------------

-- Local de estoque (separa EON Instalações de obra/terceiro)
create table estoque.local (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text,
  is_padrao   boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table estoque.local is 'Pontos de estoque: galpão EON Instalações, obras, etc.';

-- Insumo: matéria-prima (fio, disjuntor, caixa...) com unidade de medida.
create table estoque.insumo (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  unidade      text not null,                 -- 'm', 'un', 'rolo', 'pc'
  estoque_min  numeric(14,3) not null default 0,  -- estoque de segurança
  lead_time_dias  integer not null default 0,     -- prazo de entrega do fornecedor
  consumo_dia  numeric(14,3) not null default 0,  -- consumo médio diário (pode ser projetado depois)
  created_at   timestamptz not null default now()
);

comment on column estoque.insumo.unidade is 'Unidade de medida: m, un, rolo, pc...';
comment on column estoque.insumo.estoque_min is 'Estoque de segurança (folga para imprevistos).';

-- Empreendimento: demanda (450 apartamentos -> kits -> insumos).
create table estoque.empreendimento (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  qtd_apartamentos  integer not null default 0,
  created_at        timestamptz not null default now()
);

-- Tipo de kit: a "receita" genérica (kit elétrico, hidráulico...). Sem QR.
create table estoque.tipo_kit (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  created_at  timestamptz not null default now()
);

comment on table estoque.tipo_kit is 'Receita genérica do kit (molde). O BOM pendura aqui via composicao.';

-- Composição do kit (BOM): cada tipo de kit consome X de cada insumo.
create table estoque.composicao (
  id           uuid primary key default gen_random_uuid(),
  tipo_kit_id  uuid not null references estoque.tipo_kit(id) on delete cascade,
  insumo_id    uuid not null references estoque.insumo(id) on delete restrict,
  quantidade   numeric(14,3) not null check (quantidade > 0),  -- decimal: fio é fracionado
  unique (tipo_kit_id, insumo_id)
);

comment on table estoque.composicao is 'Bill of Materials. quantidade decimal de propósito (ex.: 10,5 m de fio).';

-- O unique (tipo_kit_id, insumo_id) já cobre busca por tipo_kit_id; falta o insumo_id isolado.
create index idx_composicao_insumo on estoque.composicao (insumo_id);

-- ---------------------------------------------------------------------------
-- De-Para de fornecedor: resolve "FIO FLEX 2,5MM ROLO 100M" -> Fio 2,5mm.
-- Vai aprendendo: 1ª vez confirma manual, depois entra automático.
-- ---------------------------------------------------------------------------
create table estoque.de_para_fornecedor (
  id                  uuid primary key default gen_random_uuid(),
  insumo_id           uuid not null references estoque.insumo(id) on delete cascade,
  descricao_fornecedor text not null,          -- como o fornecedor chama
  codigo_ean          text,                    -- EAN-13 da embalagem (quando existe -> match perfeito)
  fator_conversao     numeric(14,3) not null default 1, -- ex.: 1 rolo = 100 m
  created_at          timestamptz not null default now()
);

create index idx_de_para_ean on estoque.de_para_fornecedor (codigo_ean) where codigo_ean is not null;
create index idx_de_para_insumo on estoque.de_para_fornecedor (insumo_id);

-- ---------------------------------------------------------------------------
-- Produção: lote (ligado ao empreendimento) e unidade_kit (cada kit físico)
-- ---------------------------------------------------------------------------

-- Lote: uma rodada de produção. "Produzi 450 kits elétricos para o TOC."
create table estoque.lote (
  id                uuid primary key default gen_random_uuid(),
  tipo_kit_id       uuid not null references estoque.tipo_kit(id) on delete restrict,
  empreendimento_id uuid references estoque.empreendimento(id) on delete set null,
  quantidade        integer not null check (quantidade > 0),
  data_producao     date not null default current_date,
  created_at        timestamptz not null default now()
);

comment on table estoque.lote is 'Amarra a produção ao empreendimento (sem descer a bloco/apartamento).';

create index idx_lote_tipo_kit on estoque.lote (tipo_kit_id);
create index idx_lote_empreendimento on estoque.lote (empreendimento_id);

-- Unidade do kit: cada kit físico, com número e QR único.
create table estoque.unidade_kit (
  id          uuid primary key default gen_random_uuid(),
  lote_id     uuid not null references estoque.lote(id) on delete cascade,
  numero      bigint not null,                 -- número de série legível (global)
  qr_code     text not null unique,            -- conteúdo do QR (id único)
  status      text not null default 'em_estoque'
              check (status in ('em_estoque','expedido','entregue','cancelado')),
  local_id    uuid references estoque.local(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index idx_unidade_kit_lote on estoque.unidade_kit (lote_id);
create index idx_unidade_kit_status on estoque.unidade_kit (status);
create index idx_unidade_kit_local on estoque.unidade_kit (local_id);

-- Sequência para o número legível global do kit (1, 2, 3... atravessando lotes).
create sequence if not exists estoque.seq_numero_kit start 1;

-- ---------------------------------------------------------------------------
-- Movimentação: o livro-razão do estoque (entrada/saída/produção)
-- ---------------------------------------------------------------------------
create table estoque.movimentacao (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null
                  check (tipo in ('entrada_insumo','baixa_producao','saida_kit','ajuste')),
  insumo_id       uuid references estoque.insumo(id) on delete restrict,
  unidade_kit_id  uuid references estoque.unidade_kit(id) on delete restrict,
  lote_id         uuid references estoque.lote(id) on delete set null,
  local_id        uuid references estoque.local(id) on delete set null,
  quantidade      numeric(14,3) not null,      -- + entrada, - saída/baixa
  usuario_id      uuid references auth.users(id) on delete set null,
  observacao      text,
  data            timestamptz not null default now(),
  -- garante coerência: movimento de insumo referencia insumo; de kit, unidade.
  constraint chk_alvo check (
    (insumo_id is not null and unidade_kit_id is null)
    or (insumo_id is null and unidade_kit_id is not null)
  )
);

create index idx_mov_insumo on estoque.movimentacao (insumo_id);
create index idx_mov_unidade on estoque.movimentacao (unidade_kit_id);
create index idx_mov_data on estoque.movimentacao (data);
create index idx_mov_lote on estoque.movimentacao (lote_id);
create index idx_mov_local on estoque.movimentacao (local_id);
create index idx_mov_usuario on estoque.movimentacao (usuario_id);

comment on table estoque.movimentacao is 'Livro-razão. Saldo de insumo = soma das movimentações. Base do controle anti-furto.';

-- ---------------------------------------------------------------------------
-- Views de leitura
-- ---------------------------------------------------------------------------

-- Saldo atual de cada insumo = soma das movimentações.
-- security_invoker: a view respeita a RLS de quem consulta (não a do dono).
create view estoque.saldo_insumo with (security_invoker = true) as
select
  i.id            as insumo_id,
  i.nome,
  i.unidade,
  i.estoque_min,
  i.lead_time_dias,
  i.consumo_dia,
  coalesce(sum(m.quantidade), 0) as saldo
from estoque.insumo i
left join estoque.movimentacao m on m.insumo_id = i.id
group by i.id;

comment on view estoque.saldo_insumo is 'Saldo corrente por insumo (soma do livro-razão).';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Padrão: qualquer usuário autenticado lê e escreve (refinar por papel depois).
-- ---------------------------------------------------------------------------
alter table estoque.local              enable row level security;
alter table estoque.insumo             enable row level security;
alter table estoque.empreendimento     enable row level security;
alter table estoque.tipo_kit           enable row level security;
alter table estoque.composicao         enable row level security;
alter table estoque.de_para_fornecedor enable row level security;
alter table estoque.lote               enable row level security;
alter table estoque.unidade_kit        enable row level security;
alter table estoque.movimentacao       enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'local','insumo','empreendimento','tipo_kit','composicao',
    'de_para_fornecedor','lote','unidade_kit','movimentacao'
  ]
  loop
    execute format(
      'create policy "auth_all_%1$s" on estoque.%1$s for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
