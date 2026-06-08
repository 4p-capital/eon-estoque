-- ============================================================================
-- Views de leitura em 2 níveis (empresa/tenant ⟶ SPE/empreendimento):
--   - saldo_insumo_tenant: saldo de insumo agregado por EMPRESA (soma das SPEs).
--   - kits_em_estoque_view: kits prontos (em_estoque) por SPE × tipo de kit.
-- Ambas com security_invoker = true (galpão vê todos os tenants; cliente o seu).
-- A produção segue por SPE — isto é só leitura/relatório.
-- ============================================================================

-- Saldo de insumo POR EMPRESA (tenant) — o "Geral da empresa" do estoque.
create view estoque.saldo_insumo_tenant with (security_invoker = true) as
select
  m.tenant_id,
  m.insumo_id,
  i.nome,
  i.unidade,
  i.estoque_min,
  coalesce(sum(m.quantidade), 0) as saldo
from estoque.movimentacao m
join estoque.insumo i on i.id = m.insumo_id
where m.insumo_id is not null
group by m.tenant_id, m.insumo_id, i.nome, i.unidade, i.estoque_min;

comment on view estoque.saldo_insumo_tenant is
  'Saldo de cada insumo agregado por empresa (tenant) — soma das SPEs.';

-- Kits PRONTOS (status em_estoque) por SPE × tipo de kit, com tenant pra agregar.
create view estoque.kits_em_estoque_view with (security_invoker = true) as
select
  l.empreendimento_id,
  e.nome as empreendimento_nome,
  l.tipo_kit_id,
  tk.nome as tipo_kit_nome,
  count(uk.id) as qtd,
  l.tenant_id
from estoque.unidade_kit uk
join estoque.lote l on l.id = uk.lote_id
join estoque.tipo_kit tk on tk.id = l.tipo_kit_id
left join estoque.empreendimento e on e.id = l.empreendimento_id
where uk.status = 'em_estoque'
group by l.empreendimento_id, e.nome, l.tipo_kit_id, tk.nome, l.tenant_id;

comment on view estoque.kits_em_estoque_view is
  'Kits prontos (em_estoque) por empreendimento × tipo de kit (tenant pra agregar por empresa).';

grant select on estoque.saldo_insumo_tenant to authenticated, service_role;
grant select on estoque.kits_em_estoque_view to authenticated, service_role;
