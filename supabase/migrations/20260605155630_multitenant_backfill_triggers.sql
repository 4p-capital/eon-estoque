-- ============================================================================
-- Multi-tenant — Fundação (3/4): cria o tenant EON, carimba os dados existentes
-- nele, instala os triggers que DERIVAM tenant_id automaticamente e trava
-- NOT NULL.
--
-- Por que triggers (e não alterar cada RPC): produzir/entrada/receber/saída/
-- contagem são funções atômicas com locks delicados. Em vez de mexer em cada
-- uma (risco), um BEFORE INSERT SECURITY DEFINER deriva o tenant_id da cadeia
-- de FKs (empreendimento -> lote -> unidade / nota / contagem) ou, em último
-- caso, da sessão (current_tenant_id). SECURITY DEFINER para a derivação ler o
-- pai mesmo sob RLS do chamador. Se não conseguir derivar, FALHA alto (em vez
-- de gravar linha órfã invisível a todos os tenants).
-- ============================================================================

-- ── 1. Tenant EON (primeiro cliente) + backfill dos dados existentes ─────────
insert into estoque.tenant (nome, slug) values ('EON', 'eon')
  on conflict (slug) do nothing;

do $$
declare v_eon uuid;
begin
  select id into v_eon from estoque.tenant where slug = 'eon';
  update estoque.empreendimento set tenant_id = v_eon where tenant_id is null;
  update estoque.spe            set tenant_id = v_eon where tenant_id is null;
  update estoque.lote           set tenant_id = v_eon where tenant_id is null;
  update estoque.unidade_kit    set tenant_id = v_eon where tenant_id is null;
  update estoque.movimentacao   set tenant_id = v_eon where tenant_id is null;
  update estoque.nota_fiscal    set tenant_id = v_eon where tenant_id is null;
  update estoque.nota_item      set tenant_id = v_eon where tenant_id is null;
  update estoque.evento         set tenant_id = v_eon where tenant_id is null;
  update estoque.contagem       set tenant_id = v_eon where tenant_id is null;
  update estoque.contagem_item  set tenant_id = v_eon where tenant_id is null;
end $$;

-- ── 2. Funções de derivação (SECURITY DEFINER, search_path travado) ──────────

-- empreendimento e spe: derivam da sessão (o tenant cria os próprios).
create or replace function estoque.derivar_tenant_sessao()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  new.tenant_id := estoque.current_tenant_id();
  if new.tenant_id is null then
    raise exception '%: tenant_id não informado e sem sessão de tenant.', tg_table_name;
  end if;
  return new;
end; $$;

create or replace function estoque.derivar_tenant_lote()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  if new.empreendimento_id is not null then
    select tenant_id into new.tenant_id from estoque.empreendimento where id = new.empreendimento_id;
  end if;
  if new.tenant_id is null then new.tenant_id := estoque.current_tenant_id(); end if;
  if new.tenant_id is null then
    raise exception 'lote: não foi possível derivar tenant_id (informe empreendimento ou opere como tenant).';
  end if;
  return new;
end; $$;

create or replace function estoque.derivar_tenant_unidade_kit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  select tenant_id into new.tenant_id from estoque.lote where id = new.lote_id;
  if new.tenant_id is null then
    raise exception 'unidade_kit: não foi possível derivar tenant_id do lote %.', new.lote_id;
  end if;
  return new;
end; $$;

-- movimentacao: cadeia empreendimento -> lote -> unidade -> sessão.
create or replace function estoque.derivar_tenant_movimentacao()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  if new.empreendimento_id is not null then
    select tenant_id into new.tenant_id from estoque.empreendimento where id = new.empreendimento_id;
  end if;
  if new.tenant_id is null and new.lote_id is not null then
    select tenant_id into new.tenant_id from estoque.lote where id = new.lote_id;
  end if;
  if new.tenant_id is null and new.unidade_kit_id is not null then
    select tenant_id into new.tenant_id from estoque.unidade_kit where id = new.unidade_kit_id;
  end if;
  if new.tenant_id is null then new.tenant_id := estoque.current_tenant_id(); end if;
  if new.tenant_id is null then
    raise exception 'movimentacao: não foi possível derivar tenant_id (sem empreendimento/lote/unidade e sem sessão).';
  end if;
  return new;
end; $$;

create or replace function estoque.derivar_tenant_nota_fiscal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  if new.empreendimento_id is not null then
    select tenant_id into new.tenant_id from estoque.empreendimento where id = new.empreendimento_id;
  end if;
  if new.tenant_id is null and new.spe_id is not null then
    select tenant_id into new.tenant_id from estoque.spe where id = new.spe_id;
  end if;
  if new.tenant_id is null then new.tenant_id := estoque.current_tenant_id(); end if;
  if new.tenant_id is null then
    raise exception 'nota_fiscal: não foi possível derivar tenant_id (sem empreendimento/spe e sem sessão).';
  end if;
  return new;
end; $$;

create or replace function estoque.derivar_tenant_nota_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  select tenant_id into new.tenant_id from estoque.nota_fiscal where id = new.nota_id;
  if new.tenant_id is null then
    raise exception 'nota_item: não foi possível derivar tenant_id da nota %.', new.nota_id;
  end if;
  return new;
end; $$;

create or replace function estoque.derivar_tenant_evento()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  if new.nota_id is not null then
    select tenant_id into new.tenant_id from estoque.nota_fiscal where id = new.nota_id;
  end if;
  if new.tenant_id is null and new.empreendimento_id is not null then
    select tenant_id into new.tenant_id from estoque.empreendimento where id = new.empreendimento_id;
  end if;
  if new.tenant_id is null then new.tenant_id := estoque.current_tenant_id(); end if;
  if new.tenant_id is null then
    raise exception 'evento: não foi possível derivar tenant_id (sem nota/empreendimento e sem sessão).';
  end if;
  return new;
end; $$;

create or replace function estoque.derivar_tenant_contagem()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  if new.empreendimento_id is not null then
    select tenant_id into new.tenant_id from estoque.empreendimento where id = new.empreendimento_id;
  end if;
  if new.tenant_id is null then new.tenant_id := estoque.current_tenant_id(); end if;
  if new.tenant_id is null then
    raise exception 'contagem: não foi possível derivar tenant_id.';
  end if;
  return new;
end; $$;

create or replace function estoque.derivar_tenant_contagem_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  select tenant_id into new.tenant_id from estoque.contagem where id = new.contagem_id;
  if new.tenant_id is null then
    raise exception 'contagem_item: não foi possível derivar tenant_id da contagem %.', new.contagem_id;
  end if;
  return new;
end; $$;

-- Trigger functions são chamadas só pelo mecanismo de trigger (não dependem do
-- EXECUTE do usuário). Revoga o EXECUTE direto (boa prática p/ SECURITY DEFINER).
do $$
declare f text;
begin
  foreach f in array array[
    'derivar_tenant_sessao','derivar_tenant_lote','derivar_tenant_unidade_kit',
    'derivar_tenant_movimentacao','derivar_tenant_nota_fiscal','derivar_tenant_nota_item',
    'derivar_tenant_evento','derivar_tenant_contagem','derivar_tenant_contagem_item'
  ]
  loop
    execute format('revoke all on function estoque.%I() from public, anon, authenticated, service_role;', f);
  end loop;
end $$;

-- ── 3. Triggers BEFORE INSERT (derivam o tenant_id antes do WITH CHECK da RLS) ─
create trigger trg_tenant_empreendimento before insert on estoque.empreendimento
  for each row execute function estoque.derivar_tenant_sessao();
create trigger trg_tenant_spe before insert on estoque.spe
  for each row execute function estoque.derivar_tenant_sessao();
create trigger trg_tenant_lote before insert on estoque.lote
  for each row execute function estoque.derivar_tenant_lote();
create trigger trg_tenant_unidade_kit before insert on estoque.unidade_kit
  for each row execute function estoque.derivar_tenant_unidade_kit();
create trigger trg_tenant_movimentacao before insert on estoque.movimentacao
  for each row execute function estoque.derivar_tenant_movimentacao();
create trigger trg_tenant_nota_fiscal before insert on estoque.nota_fiscal
  for each row execute function estoque.derivar_tenant_nota_fiscal();
create trigger trg_tenant_nota_item before insert on estoque.nota_item
  for each row execute function estoque.derivar_tenant_nota_item();
create trigger trg_tenant_evento before insert on estoque.evento
  for each row execute function estoque.derivar_tenant_evento();
create trigger trg_tenant_contagem before insert on estoque.contagem
  for each row execute function estoque.derivar_tenant_contagem();
create trigger trg_tenant_contagem_item before insert on estoque.contagem_item
  for each row execute function estoque.derivar_tenant_contagem_item();

-- ── 4. Trava NOT NULL (dados já carimbados; triggers garantem o futuro) ───────
alter table estoque.empreendimento alter column tenant_id set not null;
alter table estoque.spe            alter column tenant_id set not null;
alter table estoque.lote           alter column tenant_id set not null;
alter table estoque.unidade_kit    alter column tenant_id set not null;
alter table estoque.movimentacao   alter column tenant_id set not null;
alter table estoque.nota_fiscal    alter column tenant_id set not null;
alter table estoque.nota_item      alter column tenant_id set not null;
alter table estoque.evento         alter column tenant_id set not null;
alter table estoque.contagem       alter column tenant_id set not null;
alter table estoque.contagem_item  alter column tenant_id set not null;
