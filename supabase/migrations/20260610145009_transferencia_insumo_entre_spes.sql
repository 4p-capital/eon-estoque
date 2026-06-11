-- ============================================================================
-- Transferência de insumo entre SPEs (produção cruzada) — rastreável.
--
-- Cenário real: por urgência/estratégia, a produção usa insumo de OUTRA SPE
-- para produzir kits de uma obra. Isso NUNCA pode ser consumo silencioso:
--   1. registra a transferência (origem → destino) num cabeçalho próprio;
--   2. lança DUAS movimentações 'transferencia' no livro-razão (−qtd na
--      origem, +qtd no destino), amarradas pelo transferencia_id;
--   3. deixa uma PENDÊNCIA DE REPOSIÇÃO persistente (reposta = false) para a
--      SPE de origem — fechada manualmente via marcar_reposta() quando o
--      insumo for reposto (a reposição em si entra pelo fluxo normal de NF).
--
-- Restrições: origem ≠ destino, MESMO tenant (estoque é por SPE; a empresa é
-- camada de leitura) e origem com DISPONÍVEL (saldo − reservado) suficiente —
-- transferir não pode furar as etiquetas pendentes da própria origem.
-- ============================================================================

-- ── 1. Livro-razão: novo tipo 'transferencia' + vínculo com o cabeçalho ──────
alter table estoque.movimentacao drop constraint movimentacao_tipo_check;
alter table estoque.movimentacao
  add constraint movimentacao_tipo_check
  check (tipo in ('entrada_insumo','baixa_producao','saida_kit','ajuste','entrada_kit','transferencia'));

-- ── 2. Tabela transferencia_insumo (cabeçalho + pendência de reposição) ──────
create table estoque.transferencia_insumo (
  id          uuid primary key default gen_random_uuid(),
  insumo_id   uuid not null references estoque.insumo(id) on delete restrict,
  origem_id   uuid not null references estoque.empreendimento(id) on delete restrict,
  destino_id  uuid not null references estoque.empreendimento(id) on delete restrict,
  lote_id     uuid references estoque.lote(id) on delete set null,
  quantidade  numeric(14,3) not null check (quantidade > 0),
  motivo      text,
  reposta     boolean not null default false,
  reposta_em  timestamptz,
  reposta_por uuid references auth.users(id) on delete set null,
  criado_por  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  tenant_id   uuid not null references estoque.tenant(id) on delete restrict,
  constraint chk_transf_origem_destino check (origem_id <> destino_id)
);

comment on table estoque.transferencia_insumo is
  'Transferência de insumo entre SPEs do mesmo tenant. reposta=false é a pendência de reposição da origem.';
comment on column estoque.transferencia_insumo.lote_id is
  'Lote que motivou a transferência (produção cruzada), quando houver.';

create index idx_transf_insumo      on estoque.transferencia_insumo (insumo_id);
create index idx_transf_origem      on estoque.transferencia_insumo (origem_id);
create index idx_transf_destino     on estoque.transferencia_insumo (destino_id);
create index idx_transf_lote        on estoque.transferencia_insumo (lote_id);
create index idx_transf_tenant      on estoque.transferencia_insumo (tenant_id);
create index idx_transf_criado_por  on estoque.transferencia_insumo (criado_por);
create index idx_transf_reposta_por on estoque.transferencia_insumo (reposta_por);
create index idx_transf_pendente    on estoque.transferencia_insumo (tenant_id, created_at)
  where not reposta;

alter table estoque.movimentacao
  add column transferencia_id uuid references estoque.transferencia_insumo(id) on delete set null;
create index idx_mov_transferencia on estoque.movimentacao (transferencia_id);

comment on column estoque.movimentacao.transferencia_id is
  'Amarra os dois lançamentos (−origem/+destino) de uma transferência entre SPEs.';

-- ── 3. Trigger de tenant: deriva do DESTINO e TRAVA "mesmo tenant" ───────────
-- A invariante origem/destino do mesmo tenant vale para QUALQUER insert (não
-- só via RPC) — validada aqui, no servidor, não no caller.
create or replace function estoque.derivar_tenant_transferencia()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_tenant_origem uuid; v_tenant_destino uuid;
begin
  select tenant_id into v_tenant_origem  from estoque.empreendimento where id = new.origem_id;
  select tenant_id into v_tenant_destino from estoque.empreendimento where id = new.destino_id;
  if v_tenant_origem is distinct from v_tenant_destino then
    raise exception 'transferencia_insumo: origem e destino devem ser do mesmo tenant.';
  end if;
  if new.tenant_id is null then
    new.tenant_id := coalesce(v_tenant_destino, estoque.current_tenant_id());
  end if;
  if new.tenant_id is null then
    raise exception 'transferencia_insumo: não foi possível derivar tenant_id.';
  end if;
  return new;
end; $$;
revoke all on function estoque.derivar_tenant_transferencia() from public, anon, authenticated, service_role;

create trigger trg_tenant_transferencia before insert on estoque.transferencia_insumo
  for each row execute function estoque.derivar_tenant_transferencia();

-- ── 4. RLS (operacional: galpão OU dono lê; só galpão escreve) ───────────────
alter table estoque.transferencia_insumo enable row level security;
create policy "transferencia_insumo_select" on estoque.transferencia_insumo
  for select to authenticated
  using ((select estoque.is_galpao()) or tenant_id = (select estoque.current_tenant_id()));
create policy "transferencia_insumo_modify" on estoque.transferencia_insumo
  for all to authenticated
  using ((select estoque.is_galpao()))
  with check ((select estoque.is_galpao()));
grant select, insert, update, delete on estoque.transferencia_insumo to authenticated, service_role;

-- ── 5. transferir_insumo: atômica (cabeçalho + 2 lançamentos) ────────────────
create or replace function estoque.transferir_insumo(
  p_insumo_id  uuid,
  p_origem_id  uuid,
  p_destino_id uuid,
  p_quantidade numeric,
  p_motivo     text default null,
  p_lote_id    uuid default null
) returns estoque.transferencia_insumo language plpgsql set search_path = '' as $$
declare
  v_transf     estoque.transferencia_insumo;
  v_insumo     estoque.insumo;
  v_origem     estoque.empreendimento;
  v_destino    estoque.empreendimento;
  v_disponivel numeric;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade a transferir deve ser maior que zero.'; end if;
  if p_origem_id is null or p_destino_id is null then
    raise exception 'Empreendimentos de origem e destino são obrigatórios.'; end if;
  if p_origem_id = p_destino_id then
    raise exception 'Origem e destino da transferência devem ser empreendimentos diferentes.'; end if;

  -- lock do insumo: serializa com gerar_etiquetas/bipe/transferências concorrentes.
  select * into v_insumo from estoque.insumo where id = p_insumo_id for update;
  if not found then raise exception 'Insumo não encontrado.'; end if;

  select * into v_origem from estoque.empreendimento where id = p_origem_id;
  if not found then raise exception 'Empreendimento de origem não encontrado.'; end if;
  select * into v_destino from estoque.empreendimento where id = p_destino_id;
  if not found then raise exception 'Empreendimento de destino não encontrado.'; end if;
  if v_origem.tenant_id <> v_destino.tenant_id then
    raise exception 'Transferência só é permitida entre empreendimentos do mesmo cliente.'; end if;

  -- valida o DISPONÍVEL da origem (saldo − reservado): transferir não pode
  -- furar as etiquetas pendentes da própria origem.
  select coalesce(d.disponivel, 0) into v_disponivel
    from estoque.saldo_insumo_disponivel d
   where d.insumo_id = p_insumo_id and d.empreendimento_id = p_origem_id;
  v_disponivel := coalesce(v_disponivel, 0);
  if v_disponivel < p_quantidade then
    raise exception
      'Disponível insuficiente em %: % % (descontando etiquetas pendentes). Solicitado: % %.',
      v_origem.nome, v_disponivel, v_insumo.unidade, p_quantidade, v_insumo.unidade; end if;

  -- lote motivador (opcional) precisa ser do mesmo cliente — rastreabilidade limpa.
  if p_lote_id is not null then
    perform 1 from estoque.lote l
     where l.id = p_lote_id and l.tenant_id = v_destino.tenant_id;
    if not found then
      raise exception 'Lote informado não pertence ao mesmo cliente da transferência.'; end if;
  end if;

  insert into estoque.transferencia_insumo
    (insumo_id, origem_id, destino_id, lote_id, quantidade, motivo, criado_por)
  values
    (p_insumo_id, p_origem_id, p_destino_id, p_lote_id, p_quantidade, p_motivo, auth.uid())
  returning * into v_transf;

  insert into estoque.movimentacao
    (tipo, insumo_id, empreendimento_id, quantidade, usuario_id, observacao, transferencia_id)
  values
    ('transferencia', p_insumo_id, p_origem_id, -p_quantidade, auth.uid(),
     'Transferência para ' || v_destino.nome || coalesce(' — ' || nullif(p_motivo, ''), ''),
     v_transf.id),
    ('transferencia', p_insumo_id, p_destino_id, p_quantidade, auth.uid(),
     'Transferência de ' || v_origem.nome || coalesce(' — ' || nullif(p_motivo, ''), ''),
     v_transf.id);

  return v_transf;
end; $$;
comment on function estoque.transferir_insumo(uuid,uuid,uuid,numeric,text,uuid) is
  'Transfere insumo entre SPEs do MESMO tenant: cabeçalho + 2 movimentações (−origem/+destino). Valida disponível da origem. Atômica.';

-- ── 6. marcar_reposta: fecha a pendência de reposição ────────────────────────
create or replace function estoque.marcar_reposta(p_transferencia_id uuid)
returns estoque.transferencia_insumo language plpgsql set search_path = '' as $$
declare v_transf estoque.transferencia_insumo;
begin
  select * into v_transf from estoque.transferencia_insumo
   where id = p_transferencia_id for update;
  if not found then raise exception 'Transferência não encontrada.'; end if;
  if v_transf.reposta then
    raise exception 'Esta transferência já foi marcada como reposta.'; end if;
  update estoque.transferencia_insumo
     set reposta = true, reposta_em = now(), reposta_por = auth.uid()
   where id = p_transferencia_id returning * into v_transf;
  return v_transf;
end; $$;
comment on function estoque.marcar_reposta(uuid) is
  'Fecha a pendência de reposição de uma transferência (reposta=true). A reposição física entra pelo fluxo normal de NF.';

-- ── 7. reposicao_pendente_view: o lembrete persistente ───────────────────────
create view estoque.reposicao_pendente_view with (security_invoker = true) as
select
  t.id,
  t.insumo_id,
  i.nome  as insumo_nome,
  i.unidade,
  t.quantidade,
  t.origem_id,
  eo.nome as origem_nome,
  t.destino_id,
  ed.nome as destino_nome,
  t.lote_id,
  t.motivo,
  t.created_at,
  t.tenant_id
from estoque.transferencia_insumo t
join estoque.insumo i           on i.id  = t.insumo_id
join estoque.empreendimento eo  on eo.id = t.origem_id
join estoque.empreendimento ed  on ed.id = t.destino_id
where not t.reposta;

comment on view estoque.reposicao_pendente_view is
  'Transferências entre SPEs ainda não repostas — alimenta o alerta persistente de reposição.';

-- ── 8. Grants ─────────────────────────────────────────────────────────────────
grant select on estoque.reposicao_pendente_view to authenticated, service_role;
grant execute on function estoque.transferir_insumo(uuid,uuid,uuid,numeric,text,uuid) to authenticated, service_role;
grant execute on function estoque.marcar_reposta(uuid) to authenticated, service_role;
