-- ============================================================================
-- Base NCM (Nomenclatura Comum do Mercosul) + classificação fiscal de insumos.
--
-- A tabela `ncm` é REFERÊNCIA oficial (Receita/Siscomex), populada pela Edge
-- Function `importar-ncm`. Catálogo GLOBAL (sem tenant_id), como insumo.
--
-- O NCM nunca é chave de match do de-para — é metadado + guarda-corpo. Por isso
-- `insumo.ncm` e `de_para_fornecedor.ncm` são TEXTO SEM FK rígida: um código
-- ausente/retirado da tabela oficial nunca pode travar uma entrada (anti-furto).
-- ============================================================================

-- pg_trgm acelera a busca textual (ILIKE) por descrição no picker de NCM.
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Tabela de referência: a nomenclatura oficial inteira (capítulos -> itens).
-- ---------------------------------------------------------------------------
create table estoque.ncm (
  codigo             text primary key,        -- só dígitos, sem pontos (casa com nota_item.ncm)
  codigo_formatado   text not null,           -- "8544.49.00" (exibição)
  nivel              smallint not null,       -- length(codigo)/2: 1=capítulo .. 4=item de 8 díg (o da NF-e)
  descricao          text not null,           -- descrição do próprio nó
  descricao_completa text not null,           -- breadcrumb dos ancestrais (significado pleno)
  data_inicio        date,
  data_fim           date,
  ato                text,                     -- "Res Camex 272/2021"
  atualizado_em      timestamptz not null default now()
);

comment on table estoque.ncm is
  'Nomenclatura Comum do Mercosul (oficial Receita/Siscomex). Referência global, populada pela Edge Function importar-ncm.';

-- Busca por texto (ILIKE em descricao_completa) e filtro por nível no picker.
create index idx_ncm_desc_trgm on estoque.ncm using gin (descricao_completa gin_trgm_ops);
create index idx_ncm_nivel on estoque.ncm (nivel);

alter table estoque.ncm enable row level security;

-- Catálogo global: todo autenticado lê; só o galpão (ou service_role) escreve.
create policy "ncm_select" on estoque.ncm for select to authenticated using (true);
create policy "ncm_modify" on estoque.ncm for all to authenticated
  using ((select estoque.is_galpao())) with check ((select estoque.is_galpao()));

-- ---------------------------------------------------------------------------
-- Classificação fiscal no insumo (soft ref) e no de-para (NCM declarado).
-- ---------------------------------------------------------------------------
alter table estoque.insumo add column ncm text;
create index idx_insumo_ncm on estoque.insumo (ncm) where ncm is not null;
comment on column estoque.insumo.ncm is
  'Classificação fiscal (NCM). Lookup em estoque.ncm, sem FK rígida (nunca trava cadastro/entrada).';

alter table estoque.de_para_fornecedor add column ncm text;
comment on column estoque.de_para_fornecedor.ncm is
  'NCM que o fornecedor declarou para este produto na NF-e (base do alerta de divergência).';
