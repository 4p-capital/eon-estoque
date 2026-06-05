-- ============================================================================
-- Multi-tenant — Fundação (2/4): coluna tenant_id (+índice) nas tabelas
-- isoladas. Nasce NULLABLE; o backfill (3/4) preenche e trava NOT NULL.
--
-- Catálogo físico (local, insumo, tipo_kit, composicao, de_para_fornecedor)
-- NÃO recebe tenant_id: é compartilhado (galpão físico único). O saldo é que
-- é por tenant (via movimentacao.tenant_id).
--
-- on delete restrict: tenant com dados não pode ser apagado por acidente
-- (integridade do livro-razão / anti-furto). Offboarding é processo explícito.
-- ============================================================================

alter table estoque.empreendimento
  add column tenant_id uuid references estoque.tenant(id) on delete restrict;
alter table estoque.spe
  add column tenant_id uuid references estoque.tenant(id) on delete restrict;
alter table estoque.lote
  add column tenant_id uuid references estoque.tenant(id) on delete restrict;
alter table estoque.unidade_kit
  add column tenant_id uuid references estoque.tenant(id) on delete restrict;
alter table estoque.movimentacao
  add column tenant_id uuid references estoque.tenant(id) on delete restrict;
alter table estoque.nota_fiscal
  add column tenant_id uuid references estoque.tenant(id) on delete restrict;
alter table estoque.nota_item
  add column tenant_id uuid references estoque.tenant(id) on delete restrict;
alter table estoque.evento
  add column tenant_id uuid references estoque.tenant(id) on delete restrict;
alter table estoque.contagem
  add column tenant_id uuid references estoque.tenant(id) on delete restrict;
alter table estoque.contagem_item
  add column tenant_id uuid references estoque.tenant(id) on delete restrict;

-- Índices em toda FK usada em filtro de RLS/join (Postgres não indexa FK sozinho).
create index idx_empreendimento_tenant on estoque.empreendimento (tenant_id);
create index idx_spe_tenant            on estoque.spe (tenant_id);
create index idx_lote_tenant           on estoque.lote (tenant_id);
create index idx_unidade_kit_tenant    on estoque.unidade_kit (tenant_id);
create index idx_mov_tenant            on estoque.movimentacao (tenant_id);
create index idx_nf_tenant             on estoque.nota_fiscal (tenant_id);
create index idx_ni_tenant             on estoque.nota_item (tenant_id);
create index idx_evento_tenant         on estoque.evento (tenant_id);
create index idx_contagem_tenant       on estoque.contagem (tenant_id);
create index idx_contagem_item_tenant  on estoque.contagem_item (tenant_id);
