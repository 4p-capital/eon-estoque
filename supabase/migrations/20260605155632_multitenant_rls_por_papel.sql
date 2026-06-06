-- ============================================================================
-- Multi-tenant — Fundação (4/4): troca a RLS "qualquer autenticado" por RLS
-- por PAPEL, e expõe tenant_id nas views segmentadas.
--
-- Matriz:
--   Catálogo (local/insumo/tipo_kit/composicao/de_para_fornecedor): global.
--     select: qualquer autenticado | escrever: só galpão.
--   Operacional (lote/unidade_kit/movimentacao/nota_fiscal/nota_item/evento/
--     contagem/contagem_item): select: galpão OU dono do tenant | escrever: só galpão.
--   empreendimento: galpão OU dono (tenant cria via cadastro de SPE) — R/W.
--   spe (COFRE FISCAL): só o dono do tenant — galpão é CEGO (não vê cert/cadastro).
--
-- ⚠️ CUTOVER: ao aplicar isto no remoto, os usuários existentes PRECISAM receber
-- app_metadata.papel (ex.: 'galpao_admin') no mesmo passo — senão ficam sem papel
-- e sem tenant, perdendo acesso a tudo. Ver passo de provisionamento (Milestone 2).
-- ============================================================================

-- ── 1. Remove as policies antigas "authenticated all" ───────────────────────
drop policy if exists "auth_all_local"              on estoque.local;
drop policy if exists "auth_all_insumo"             on estoque.insumo;
drop policy if exists "auth_all_tipo_kit"           on estoque.tipo_kit;
drop policy if exists "auth_all_composicao"         on estoque.composicao;
drop policy if exists "auth_all_de_para_fornecedor" on estoque.de_para_fornecedor;
drop policy if exists "auth_all_empreendimento"     on estoque.empreendimento;
drop policy if exists "auth_all_lote"               on estoque.lote;
drop policy if exists "auth_all_unidade_kit"        on estoque.unidade_kit;
drop policy if exists "auth_all_movimentacao"       on estoque.movimentacao;
drop policy if exists "auth_all_nota_fiscal"        on estoque.nota_fiscal;
drop policy if exists "auth_all_nota_item"          on estoque.nota_item;
drop policy if exists "auth_all_evento"             on estoque.evento;
drop policy if exists "auth_all_spe"                on estoque.spe;
drop policy if exists "contagem_authenticated_all"      on estoque.contagem;
drop policy if exists "contagem_item_authenticated_all" on estoque.contagem_item;

-- ── 2. Catálogo (global): todos leem; só galpão escreve ──────────────────────
do $$
declare t text;
begin
  foreach t in array array['local','insumo','tipo_kit','composicao','de_para_fornecedor']
  loop
    execute format(
      'create policy "%1$s_select" on estoque.%1$s for select to authenticated using (true);', t);
    execute format(
      'create policy "%1$s_modify" on estoque.%1$s for all to authenticated '
      'using ((select estoque.is_galpao())) with check ((select estoque.is_galpao()));', t);
  end loop;
end $$;

-- ── 3. Operacional: galpão OU dono lê; só galpão escreve ─────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'lote','unidade_kit','movimentacao','nota_fiscal','nota_item','evento','contagem','contagem_item'
  ]
  loop
    execute format(
      'create policy "%1$s_select" on estoque.%1$s for select to authenticated '
      'using ((select estoque.is_galpao()) or tenant_id = (select estoque.current_tenant_id()));', t);
    execute format(
      'create policy "%1$s_modify" on estoque.%1$s for all to authenticated '
      'using ((select estoque.is_galpao())) with check ((select estoque.is_galpao()));', t);
  end loop;
end $$;

-- ── 4. empreendimento: galpão OU dono — R/W (tenant cria via cadastro de SPE) ─
create policy "empreendimento_rw" on estoque.empreendimento
  for all to authenticated
  using ((select estoque.is_galpao()) or tenant_id = (select estoque.current_tenant_id()))
  with check ((select estoque.is_galpao()) or tenant_id = (select estoque.current_tenant_id()));

-- ── 5. spe: cofre fiscal — SÓ o dono do tenant. Galpão é cego. ───────────────
-- (A consulta SEFAZ que precisa do certificado roda com service_role, que tem
--  BYPASSRLS — o galpão operador nunca lê o .pfx nem o cadastro da SPE.)
create policy "spe_rw" on estoque.spe
  for all to authenticated
  using (tenant_id = (select estoque.current_tenant_id()))
  with check (tenant_id = (select estoque.current_tenant_id()));

-- ── 6. Views segmentadas: expõem tenant_id (security_invoker já isola) ───────
-- A RLS subjacente (security_invoker) já filtra por tenant; a coluna tenant_id
-- serve para o galpão (que vê todos) segmentar/rotular por cliente na UI.

create or replace view estoque.saldo_insumo_empreendimento with (security_invoker = true) as
select
  m.insumo_id,
  m.empreendimento_id,
  i.nome,
  i.unidade,
  coalesce(sum(m.quantidade), 0) as saldo,
  m.tenant_id
from estoque.movimentacao m
join estoque.insumo i on i.id = m.insumo_id
where m.insumo_id is not null
  and m.empreendimento_id is not null
group by m.insumo_id, m.empreendimento_id, i.nome, i.unidade, m.tenant_id;

create or replace view estoque.lote_resumo_view with (security_invoker = true) as
select l.id as lote_id, l.tipo_kit_id, tk.nome as tipo_kit_nome,
  l.empreendimento_id, e.nome as empreendimento_nome, l.status, l.meta,
  count(uk.id) filter (where uk.impressa_em is not null) as qtd_impressas,
  count(uk.id) filter (where uk.entrada_em  is not null) as qtd_bipadas,
  count(uk.id) filter (where uk.status = 'pendente')     as qtd_pendentes,
  count(uk.id) filter (where uk.status = 'cancelado')    as qtd_canceladas,
  count(uk.id) filter (where uk.impressa_em is not null)
    - count(uk.id) filter (where uk.entrada_em is not null)
    - count(uk.id) filter (where uk.status = 'cancelado') as gap,
  l.data_producao, l.created_at, l.finalizado_em,
  l.tenant_id
from estoque.lote l
join estoque.tipo_kit tk on tk.id = l.tipo_kit_id
left join estoque.empreendimento e on e.id = l.empreendimento_id
left join estoque.unidade_kit uk on uk.lote_id = l.id
group by l.id, tk.nome, e.nome;

create or replace view estoque.contagem_resumo with (security_invoker = true) as
select
  c.id,
  c.empreendimento_id,
  e.nome as empreendimento_nome,
  c.regiao,
  c.status,
  c.observacao,
  c.created_at,
  c.aplicada_em,
  count(ci.id) as qtd_itens,
  coalesce(sum(ci.qtd_contada - coalesce(ci.saldo_sistema, 0)), 0) as diferenca_total,
  c.tenant_id
from estoque.contagem c
join estoque.empreendimento e on e.id = c.empreendimento_id
left join estoque.contagem_item ci on ci.contagem_id = c.id
group by c.id, e.nome;
