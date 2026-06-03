-- ============================================================================
-- Produção "lote vivo": abrir lote → gerar/imprimir etiquetas (status 'pendente',
-- SEM baixa de BOM) → bipar entrada no depósito (pendente → em_estoque, AÍ baixa
-- o BOM de 1 kit + registra entrada) → finalizar/cancelar lote manualmente.
--
-- "Estoque de kit pronto" = unidades 'em_estoque'. registrar_saida_kit segue
-- exigindo 'em_estoque' (saída de pendente é recusada). produzir_lote é REMOVIDA
-- (substituída pelo novo fluxo; nada no banco a referenciava).
--
-- Atomicidade/locks espelham produzir_lote + aplicar_contagem:
--   - lock das linhas de insumo do BOM (for update) antes de validar/baixar;
--   - lock da unidade (for update) antes de mudar status (anti baixa dupla).
-- ============================================================================

-- ── 1. ALTERs de tabela ─────────────────────────────────────────────────────

-- lote: ganha ciclo de vida + meta opcional; quantidade vira nullable (legado).
alter table estoque.lote
  add column status text not null default 'aberto'
      check (status in ('aberto','finalizado','cancelado')),
  add column meta integer check (meta is null or meta > 0),
  add column finalizado_em timestamptz,
  add column finalizado_por uuid references auth.users(id) on delete set null;
alter table estoque.lote drop constraint lote_quantidade_check;
alter table estoque.lote alter column quantidade drop not null;
alter table estoque.lote
  add constraint lote_quantidade_check check (quantidade is null or quantidade > 0);

comment on column estoque.lote.status is
  'Ciclo de vida do lote vivo: aberto (gerando/bipando) → finalizado | cancelado.';
comment on column estoque.lote.meta is
  'Quantidade-alvo informativa do lote. NÃO bloqueia (cliente só avisa).';
comment on column estoque.lote.quantidade is
  'Legado/informativo. No lote vivo a verdade é a contagem de unidades.';

-- Lotes pré-existentes (produção antiga) já estão "produzidos": finalizo.
update estoque.lote set status = 'finalizado', finalizado_em = coalesce(created_at, now())
 where status = 'aberto';

create index idx_lote_status on estoque.lote (status);

-- unidade_kit: status ganha 'pendente' (novo default) + carimbos impressão/entrada.
alter table estoque.unidade_kit drop constraint unidade_kit_status_check;
alter table estoque.unidade_kit
  add constraint unidade_kit_status_check
  check (status in ('pendente','em_estoque','expedido','entregue','cancelado'));
alter table estoque.unidade_kit alter column status set default 'pendente';
alter table estoque.unidade_kit
  add column impressa_em timestamptz,
  add column entrada_em  timestamptz,
  add column entrada_por uuid references auth.users(id) on delete set null;

comment on column estoque.unidade_kit.impressa_em is
  'Quando a etiqueta foi gerada/impressa (gerar_etiquetas). Toda unidade nasce com isto.';
comment on column estoque.unidade_kit.entrada_em is
  'Quando a unidade foi bipada na entrada do depósito (pendente → em_estoque, baixa BOM).';

-- Unidades pré-existentes (em_estoque) já foram "bipadas" no modelo antigo.
update estoque.unidade_kit
   set impressa_em = coalesce(impressa_em, created_at),
       entrada_em  = coalesce(entrada_em, created_at)
 where status in ('em_estoque','expedido','entregue');

create index idx_unidade_kit_entrada_em on estoque.unidade_kit (entrada_em);
create index idx_unidade_kit_lote_status on estoque.unidade_kit (lote_id, status);

-- movimentacao: novo tipo 'entrada_kit' (entrada de kit pronto no depósito, +1).
alter table estoque.movimentacao drop constraint movimentacao_tipo_check;
alter table estoque.movimentacao
  add constraint movimentacao_tipo_check
  check (tipo in ('entrada_insumo','baixa_producao','saida_kit','ajuste','entrada_kit'));

-- ── 2. abrir_lote ───────────────────────────────────────────────────────────
create or replace function estoque.abrir_lote(
  p_tipo_kit_id uuid, p_empreendimento_id uuid, p_meta integer default null
) returns estoque.lote language plpgsql set search_path = '' as $$
declare v_lote estoque.lote;
begin
  if p_tipo_kit_id is null then raise exception 'Tipo de kit é obrigatório.'; end if;
  if p_empreendimento_id is null then
    raise exception 'Empreendimento é obrigatório para abrir um lote (estoque é por empreendimento).'; end if;
  if p_meta is not null and p_meta <= 0 then
    raise exception 'Meta, quando informada, deve ser maior que zero.'; end if;
  insert into estoque.lote (tipo_kit_id, empreendimento_id, meta, status)
  values (p_tipo_kit_id, p_empreendimento_id, p_meta, 'aberto') returning * into v_lote;
  return v_lote;
end; $$;
comment on function estoque.abrir_lote(uuid,uuid,integer) is
  'Abre um lote vivo (aberto). Empreendimento obrigatório; meta opcional informativa.';

-- ── 3. gerar_etiquetas (SEM baixa de BOM) ───────────────────────────────────
create or replace function estoque.gerar_etiquetas(p_lote_id uuid, p_quantidade integer)
returns setof estoque.unidade_kit language plpgsql set search_path = '' as $$
declare v_status text;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade de etiquetas deve ser maior que zero.'; end if;
  select status into v_status from estoque.lote where id = p_lote_id for update;
  if v_status is null then raise exception 'Lote não encontrado.'; end if;
  if v_status <> 'aberto' then
    raise exception 'Lote está % e não aceita novas etiquetas (apenas lotes abertos).', v_status; end if;
  return query
  insert into estoque.unidade_kit (lote_id, numero, qr_code, status, impressa_em)
  select p_lote_id, nextval('estoque.seq_numero_kit'), gen_random_uuid()::text, 'pendente', now()
  from generate_series(1, p_quantidade) returning *;
end; $$;
comment on function estoque.gerar_etiquetas(uuid,integer) is
  'Gera N unidades pendentes (QR+numero+impressa_em) para lote aberto. SEM baixa de BOM.';

-- ── 4. registrar_entrada_kit (bipe: baixa BOM de 1 kit + pendente→em_estoque) ─
create or replace function estoque.registrar_entrada_kit(p_qr_code text, p_local_id uuid default null)
returns estoque.unidade_kit language plpgsql set search_path = '' as $$
declare v_unidade estoque.unidade_kit; v_tipo_kit uuid; v_emp uuid;
        v_possiveis bigint; v_gargalo text;
begin
  select uk.* into v_unidade from estoque.unidade_kit uk where uk.qr_code = p_qr_code for update;
  if not found then raise exception 'QR não encontrado: %', p_qr_code; end if;
  if v_unidade.status <> 'pendente' then
    raise exception 'Kit % não está pendente (status: %). Entrada já registrada ou unidade cancelada.',
      v_unidade.numero, v_unidade.status; end if;
  select l.tipo_kit_id, l.empreendimento_id into v_tipo_kit, v_emp
    from estoque.lote l where l.id = v_unidade.lote_id;
  if v_emp is null then
    raise exception 'Lote do kit % não tem empreendimento; entrada não pode baixar o BOM.', v_unidade.numero; end if;
  -- serializa entradas concorrentes do mesmo insumo (igual produzir_lote).
  perform 1 from estoque.insumo i
   where i.id in (select c.insumo_id from estoque.composicao c where c.tipo_kit_id = v_tipo_kit)
   for update;
  select qtd_possivel, insumo_gargalo_nome into v_possiveis, v_gargalo
    from estoque.calcular_kits_possiveis(v_tipo_kit, v_emp);
  if v_possiveis < 1 then
    raise exception 'Insumo insuficiente neste empreendimento para 1 kit; gargalo: %.',
      coalesce(v_gargalo,'BOM vazio'); end if;
  -- baixa o BOM de 1 kit (uma movimentação negativa por insumo).
  insert into estoque.movimentacao
    (tipo, insumo_id, lote_id, local_id, empreendimento_id, quantidade, usuario_id, observacao)
  select 'baixa_producao', c.insumo_id, v_unidade.lote_id, p_local_id, v_emp,
         -c.quantidade, auth.uid(), 'Baixa do BOM na entrada do kit #' || v_unidade.numero
  from estoque.composicao c where c.tipo_kit_id = v_tipo_kit;
  -- promove a unidade a estoque pronto.
  update estoque.unidade_kit
     set status = 'em_estoque', entrada_em = now(), entrada_por = auth.uid(),
         local_id = coalesce(p_local_id, local_id)
   where id = v_unidade.id returning * into v_unidade;
  -- registra a entrada do kit pronto (+1) no livro-razão.
  insert into estoque.movimentacao
    (tipo, unidade_kit_id, lote_id, local_id, empreendimento_id, quantidade, usuario_id, observacao)
  values ('entrada_kit', v_unidade.id, v_unidade.lote_id, p_local_id, v_emp, 1, auth.uid(),
          'Entrada do kit pronto no depósito');
  return v_unidade;
end; $$;
comment on function estoque.registrar_entrada_kit(text,uuid) is
  'Bipe de entrada: pendente→em_estoque, baixa BOM de 1 kit e registra entrada (+1). Atômico, anti baixa dupla.';

-- ── 5. finalizar_lote (permite com pendentes; aviso é no client) ─────────────
create or replace function estoque.finalizar_lote(p_lote_id uuid)
returns estoque.lote language plpgsql set search_path = '' as $$
declare v_lote estoque.lote;
begin
  select * into v_lote from estoque.lote where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  if v_lote.status <> 'aberto' then
    raise exception 'Lote já está % e não pode ser finalizado novamente.', v_lote.status; end if;
  update estoque.lote set status = 'finalizado', finalizado_em = now(), finalizado_por = auth.uid()
   where id = p_lote_id returning * into v_lote;
  return v_lote;
end; $$;
comment on function estoque.finalizar_lote(uuid) is
  'Finaliza lote aberto (permite com pendentes; aviso de gap é no client).';

-- ── 6. cancelar_lote (cancela lote aberto + suas unidades pendentes) ─────────
create or replace function estoque.cancelar_lote(p_lote_id uuid)
returns estoque.lote language plpgsql set search_path = '' as $$
declare v_lote estoque.lote;
begin
  select * into v_lote from estoque.lote where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  if v_lote.status <> 'aberto' then
    raise exception 'Apenas lotes abertos podem ser cancelados (status atual: %).', v_lote.status; end if;
  update estoque.unidade_kit set status = 'cancelado'
   where lote_id = p_lote_id and status = 'pendente';
  update estoque.lote set status = 'cancelado', finalizado_em = now(), finalizado_por = auth.uid()
   where id = p_lote_id returning * into v_lote;
  return v_lote;
end; $$;
comment on function estoque.cancelar_lote(uuid) is
  'Cancela lote aberto e suas unidades pendentes. Não afeta unidades já bipadas.';

-- ── 7. lote_resumo_view (reconciliação impresso × bipado) ────────────────────
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
  l.data_producao, l.created_at, l.finalizado_em
from estoque.lote l
join estoque.tipo_kit tk on tk.id = l.tipo_kit_id
left join estoque.empreendimento e on e.id = l.empreendimento_id
left join estoque.unidade_kit uk on uk.lote_id = l.id
group by l.id, tk.nome, e.nome;
comment on view estoque.lote_resumo_view is
  'Reconciliação por lote: impressas (geradas) vs bipadas (entraram) vs pendentes (gap).';

-- ── 8. Remove produzir_lote (substituída) e concede grants ───────────────────
drop function if exists estoque.produzir_lote(uuid, integer, uuid, uuid);

grant select on estoque.lote_resumo_view to authenticated, service_role;
grant execute on function estoque.abrir_lote(uuid,uuid,integer)       to authenticated, service_role;
grant execute on function estoque.gerar_etiquetas(uuid,integer)        to authenticated, service_role;
grant execute on function estoque.registrar_entrada_kit(text,uuid)     to authenticated, service_role;
grant execute on function estoque.finalizar_lote(uuid)                 to authenticated, service_role;
grant execute on function estoque.cancelar_lote(uuid)                  to authenticated, service_role;
