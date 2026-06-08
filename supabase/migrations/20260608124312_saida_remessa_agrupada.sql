-- ============================================================================
-- Saída agrupada (remessa) — espelha o modelo de lote pra expedição.
-- Uma SAIDA é uma remessa de UM empreendimento: abre-se, bipa-se os kits dentro
-- dela (em_estoque -> expedido), finaliza/cancela. Dá rastreabilidade: quais
-- kits saíram juntos, pra onde, quando, por quem.
--
-- A RPC antiga registrar_saida_kit(text,uuid,text) fica intocada (deprecada) pra
-- não quebrar a tela atual durante o deploy; a nova bipagem usa bipar_saida().
-- ============================================================================

-- ── 1. Tabela saida (cabeçalho da remessa) ───────────────────────────────────
create table estoque.saida (
  id                uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references estoque.empreendimento(id) on delete restrict,
  destino           text,                       -- obra/caminhão/responsável (texto livre)
  status            text not null default 'aberta'
                    check (status in ('aberta', 'finalizada', 'cancelada')),
  observacao        text,
  criado_por        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  finalizado_em     timestamptz,
  finalizado_por    uuid references auth.users(id) on delete set null,
  tenant_id         uuid not null references estoque.tenant(id) on delete restrict
);

comment on table estoque.saida is
  'Remessa de expedição (1 empreendimento). Agrupa os kits expedidos pra rastreio.';

create index idx_saida_empreendimento on estoque.saida (empreendimento_id);
create index idx_saida_tenant on estoque.saida (tenant_id);
create index idx_saida_status on estoque.saida (status);
create index idx_saida_criado_por on estoque.saida (criado_por);

-- ── 2. unidade_kit ganha o vínculo com a remessa ────────────────────────────
alter table estoque.unidade_kit
  add column saida_id uuid references estoque.saida(id) on delete set null;
create index idx_unidade_kit_saida on estoque.unidade_kit (saida_id);

-- ── 3. Trigger de tenant (deriva do empreendimento da remessa) ──────────────
create or replace function estoque.derivar_tenant_saida()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  if new.empreendimento_id is not null then
    select tenant_id into new.tenant_id from estoque.empreendimento where id = new.empreendimento_id;
  end if;
  if new.tenant_id is null then new.tenant_id := estoque.current_tenant_id(); end if;
  if new.tenant_id is null then
    raise exception 'saida: não foi possível derivar tenant_id.';
  end if;
  return new;
end; $$;
revoke all on function estoque.derivar_tenant_saida() from public, anon, authenticated, service_role;

create trigger trg_tenant_saida before insert on estoque.saida
  for each row execute function estoque.derivar_tenant_saida();

-- ── 4. RLS (operacional: galpão OU dono lê; só galpão escreve) ───────────────
alter table estoque.saida enable row level security;
create policy "saida_select" on estoque.saida
  for select to authenticated
  using ((select estoque.is_galpao()) or tenant_id = (select estoque.current_tenant_id()));
create policy "saida_modify" on estoque.saida
  for all to authenticated
  using ((select estoque.is_galpao()))
  with check ((select estoque.is_galpao()));
grant select, insert, update, delete on estoque.saida to authenticated, service_role;

-- ── 5. RPCs ──────────────────────────────────────────────────────────────────

-- abrir_saida: abre uma remessa pra um empreendimento.
create or replace function estoque.abrir_saida(
  p_empreendimento_id uuid, p_destino text default null, p_observacao text default null
) returns estoque.saida language plpgsql set search_path = '' as $$
declare v_saida estoque.saida;
begin
  if p_empreendimento_id is null then
    raise exception 'Empreendimento é obrigatório para abrir uma saída.';
  end if;
  insert into estoque.saida (empreendimento_id, destino, observacao, status, criado_por)
  values (p_empreendimento_id, p_destino, p_observacao, 'aberta', auth.uid())
  returning * into v_saida;
  return v_saida;
end; $$;
comment on function estoque.abrir_saida(uuid, text, text) is
  'Abre uma remessa de saída (aberta) pra um empreendimento. Destino/observação opcionais.';

-- bipar_saida: bipa um kit dentro da remessa (em_estoque -> expedido).
create or replace function estoque.bipar_saida(p_saida_id uuid, p_qr_code text)
returns estoque.unidade_kit language plpgsql set search_path = '' as $$
declare v_unidade estoque.unidade_kit; v_saida estoque.saida; v_emp_lote uuid;
begin
  select * into v_saida from estoque.saida where id = p_saida_id for update;
  if not found then raise exception 'Saída não encontrada.'; end if;
  if v_saida.status <> 'aberta' then
    raise exception 'Esta saída está % e não aceita mais kits.', v_saida.status;
  end if;

  select uk.* into v_unidade from estoque.unidade_kit uk where uk.qr_code = p_qr_code for update;
  if not found then raise exception 'QR não encontrado: %', p_qr_code; end if;
  if v_unidade.status <> 'em_estoque' then
    raise exception 'Kit % não está em estoque (status: %). Saída recusada.',
      v_unidade.numero, v_unidade.status;
  end if;

  -- valida: o kit pertence ao MESMO empreendimento da remessa.
  select l.empreendimento_id into v_emp_lote from estoque.lote l where l.id = v_unidade.lote_id;
  if v_emp_lote is distinct from v_saida.empreendimento_id then
    raise exception 'Kit % é de outro empreendimento — não pode entrar nesta saída.', v_unidade.numero;
  end if;

  update estoque.unidade_kit
     set status = 'expedido', saida_id = p_saida_id
   where id = v_unidade.id
  returning * into v_unidade;

  insert into estoque.movimentacao
    (tipo, unidade_kit_id, lote_id, empreendimento_id, quantidade, usuario_id, observacao)
  values
    ('saida_kit', v_unidade.id, v_unidade.lote_id, v_saida.empreendimento_id, -1, auth.uid(),
     'Saída — ' || coalesce(nullif(v_saida.destino, ''), 'remessa ' || left(v_saida.id::text, 8)));

  return v_unidade;
end; $$;
comment on function estoque.bipar_saida(uuid, text) is
  'Bipe de saída: em_estoque -> expedido dentro de uma remessa. Valida empreendimento e recusa baixa dupla.';

-- finalizar_saida
create or replace function estoque.finalizar_saida(p_saida_id uuid)
returns estoque.saida language plpgsql set search_path = '' as $$
declare v_saida estoque.saida;
begin
  select * into v_saida from estoque.saida where id = p_saida_id for update;
  if not found then raise exception 'Saída não encontrada.'; end if;
  if v_saida.status <> 'aberta' then
    raise exception 'Saída já está % e não pode ser finalizada.', v_saida.status;
  end if;
  update estoque.saida set status = 'finalizada', finalizado_em = now(), finalizado_por = auth.uid()
   where id = p_saida_id returning * into v_saida;
  return v_saida;
end; $$;
comment on function estoque.finalizar_saida(uuid) is 'Finaliza a remessa de saída (aberta -> finalizada).';

-- cancelar_saida: só se estiver VAZIA (sem kits bipados).
create or replace function estoque.cancelar_saida(p_saida_id uuid)
returns estoque.saida language plpgsql set search_path = '' as $$
declare v_saida estoque.saida; v_qtd integer;
begin
  select * into v_saida from estoque.saida where id = p_saida_id for update;
  if not found then raise exception 'Saída não encontrada.'; end if;
  if v_saida.status <> 'aberta' then
    raise exception 'Apenas saídas abertas podem ser canceladas (status: %).', v_saida.status;
  end if;
  select count(*) into v_qtd from estoque.unidade_kit where saida_id = p_saida_id;
  if v_qtd > 0 then
    raise exception 'Esta saída já tem % kit(s) — finalize-a em vez de cancelar.', v_qtd;
  end if;
  update estoque.saida set status = 'cancelada', finalizado_em = now(), finalizado_por = auth.uid()
   where id = p_saida_id returning * into v_saida;
  return v_saida;
end; $$;
comment on function estoque.cancelar_saida(uuid) is 'Cancela uma remessa aberta SEM kits (descarte de rascunho).';

-- ── 6. View de resumo (lista/reconciliação) ─────────────────────────────────
create or replace view estoque.saida_resumo_view with (security_invoker = true) as
select
  s.id as saida_id,
  s.empreendimento_id,
  e.nome as empreendimento_nome,
  s.destino,
  s.status,
  s.observacao,
  s.created_at,
  s.finalizado_em,
  count(uk.id) as qtd_kits,
  s.tenant_id
from estoque.saida s
join estoque.empreendimento e on e.id = s.empreendimento_id
left join estoque.unidade_kit uk on uk.saida_id = s.id
group by s.id, e.nome;

grant select on estoque.saida_resumo_view to authenticated, service_role;
grant execute on function estoque.abrir_saida(uuid, text, text) to authenticated, service_role;
grant execute on function estoque.bipar_saida(uuid, text)        to authenticated, service_role;
grant execute on function estoque.finalizar_saida(uuid)          to authenticated, service_role;
grant execute on function estoque.cancelar_saida(uuid)           to authenticated, service_role;
