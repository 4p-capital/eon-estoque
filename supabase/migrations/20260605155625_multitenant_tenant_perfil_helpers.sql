-- ============================================================================
-- Multi-tenant — Fundação (1/4): tabela tenant, tabela perfil e helpers de RLS.
--
-- Modelo: TENANT (cliente/construtora, ex.: EON) é o eixo de isolamento. Cada
-- usuário tem um PERFIL com papel; staff do galpão (galpao_*) é cross-tenant e
-- não pertence a nenhum tenant; usuário de cliente (tenant_*) pertence a um.
--
-- ENFORCEMENT da RLS lê o JWT (app_metadata.tenant_id / app_metadata.papel),
-- nunca user_metadata (editável pelo usuário). A tabela `perfil` é a fonte da
-- UI de membros e deve ser mantida em sincronia com o app_metadata pela
-- camada de provisionamento (Milestone 2); a RLS NÃO a lê (evita join).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tenant: o cliente dono dos dados (suas SPEs, empreendimentos, estoque).
-- ---------------------------------------------------------------------------
create table estoque.tenant (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  slug        text not null unique,          -- identificador estável/legível (ex.: 'eon')
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table estoque.tenant is
  'Cliente/construtora dona dos dados. Eixo de isolamento multi-tenant (RLS por tenant_id).';

create trigger trg_tenant_updated_at
  before update on estoque.tenant
  for each row execute function estoque.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Perfil: papel do usuário. Espelho consultável do app_metadata (display/UI).
--   galpao_*  -> staff do galpão (EON operação), SEM tenant, vê todos.
--   tenant_*  -> usuário do cliente, COM tenant, vê só o seu.
-- ---------------------------------------------------------------------------
create table estoque.perfil (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid references estoque.tenant(id) on delete cascade,  -- null = staff do galpão
  papel       text not null
              check (papel in ('galpao_admin','galpao_operador','tenant_admin','tenant_gestor')),
  nome        text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- staff do galpão não tem tenant; usuário de cliente precisa de tenant.
  constraint chk_perfil_tenant_papel check (
    (papel like 'galpao_%' and tenant_id is null)
    or (papel like 'tenant_%' and tenant_id is not null)
  )
);

comment on table estoque.perfil is
  'Papel do usuário (espelho do app_metadata p/ UI de membros). A RLS lê o JWT, não esta tabela.';

create index idx_perfil_tenant on estoque.perfil (tenant_id);

create trigger trg_perfil_updated_at
  before update on estoque.perfil
  for each row execute function estoque.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers de RLS — leem o JWT (app_metadata). STABLE p/ o planner avaliar 1x.
-- Sem JWT (ex.: seed como postgres / service_role) retornam null/false; ok
-- porque service_role tem BYPASSRLS e o seed carimba tenant explicitamente.
-- ---------------------------------------------------------------------------
create or replace function estoque.current_tenant_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif((select auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid
$$;

comment on function estoque.current_tenant_id() is
  'tenant_id do usuário logado (app_metadata.tenant_id do JWT). null p/ staff do galpão.';

create or replace function estoque.current_papel()
returns text
language sql
stable
set search_path = ''
as $$
  select (select auth.jwt() -> 'app_metadata' ->> 'papel')
$$;

create or replace function estoque.is_galpao()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'papel') like 'galpao_%', false)
$$;

comment on function estoque.is_galpao() is
  'True se o usuário é staff do galpão (papel galpao_*): enxerga dados operacionais de todos os tenants.';

grant execute on function estoque.current_tenant_id() to authenticated, service_role;
grant execute on function estoque.current_papel()     to authenticated, service_role;
grant execute on function estoque.is_galpao()         to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS de tenant e perfil
-- ---------------------------------------------------------------------------
alter table estoque.tenant enable row level security;
alter table estoque.perfil enable row level security;

-- tenant: galpão vê todos; usuário vê só o seu. Só galpão provisiona/edita.
create policy "tenant_select" on estoque.tenant
  for select to authenticated
  using ((select estoque.is_galpao()) or id = (select estoque.current_tenant_id()));

create policy "tenant_modify" on estoque.tenant
  for all to authenticated
  using ((select estoque.is_galpao()))
  with check ((select estoque.is_galpao()));

-- perfil: vê o próprio; galpão vê todos; usuário vê os do seu tenant.
create policy "perfil_select" on estoque.perfil
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select estoque.is_galpao())
    or tenant_id = (select estoque.current_tenant_id())
  );

-- galpão gerencia qualquer perfil; tenant_admin gerencia os do próprio tenant.
create policy "perfil_modify" on estoque.perfil
  for all to authenticated
  using (
    (select estoque.is_galpao())
    or (
      tenant_id = (select estoque.current_tenant_id())
      and (select estoque.current_papel()) = 'tenant_admin'
    )
  )
  with check (
    (select estoque.is_galpao())
    or (
      tenant_id = (select estoque.current_tenant_id())
      and (select estoque.current_papel()) = 'tenant_admin'
    )
  );

-- Grants de tabela (alinhado ao restante do schema estoque).
grant select, insert, update, delete on estoque.tenant, estoque.perfil
  to authenticated, service_role;
