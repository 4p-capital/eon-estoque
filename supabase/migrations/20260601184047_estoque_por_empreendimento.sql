-- ============================================================================
-- Estoque por empreendimento (segmentação aditiva).
-- O livro-razão ganha empreendimento_id; nasce a view de saldo por empreendimento
-- e a sobrecarga de calcular_kits_possiveis(tipo_kit, empreendimento). A view
-- global saldo_insumo e a função de 1 arg seguem INTACTAS (dashboard/insumos ok).
-- produzir_lote passa a consumir do estoque do empreendimento.
-- ============================================================================

alter table estoque.movimentacao
  add column empreendimento_id uuid references estoque.empreendimento(id) on delete set null;

create index idx_mov_empreendimento on estoque.movimentacao (empreendimento_id);

comment on column estoque.movimentacao.empreendimento_id is
  'Empreendimento dono do lançamento. Base do saldo segmentado (entrada/produção).';

-- Saldo por insumo × empreendimento (a verdade segmentada).
create view estoque.saldo_insumo_empreendimento with (security_invoker = true) as
select
  m.insumo_id,
  m.empreendimento_id,
  i.nome,
  i.unidade,
  coalesce(sum(m.quantidade), 0) as saldo
from estoque.movimentacao m
join estoque.insumo i on i.id = m.insumo_id
where m.insumo_id is not null
  and m.empreendimento_id is not null
group by m.insumo_id, m.empreendimento_id, i.nome, i.unidade;

comment on view estoque.saldo_insumo_empreendimento is
  'Saldo de cada insumo POR empreendimento (soma do livro-razão filtrada).';

-- Sobrecarga: kits possíveis usando o saldo daquele empreendimento.
create or replace function estoque.calcular_kits_possiveis(
  p_tipo_kit_id uuid,
  p_empreendimento_id uuid
)
returns table (
  qtd_possivel        bigint,
  insumo_gargalo_id   uuid,
  insumo_gargalo_nome text
)
language sql
stable
set search_path = ''
as $$
  with limites as (
    select
      c.insumo_id,
      i.nome as insumo_nome,
      floor(coalesce(s.saldo, 0) / c.quantidade)::bigint as limite
    from estoque.composicao c
    join estoque.insumo i on i.id = c.insumo_id
    left join estoque.saldo_insumo_empreendimento s
      on s.insumo_id = c.insumo_id and s.empreendimento_id = p_empreendimento_id
    where c.tipo_kit_id = p_tipo_kit_id
  ),
  gargalo as (
    select insumo_id, insumo_nome
    from limites
    order by limite asc, insumo_id asc
    limit 1
  )
  select
    coalesce((select min(limite) from limites), 0) as qtd_possivel,
    (select insumo_id   from gargalo),
    (select insumo_nome from gargalo);
$$;

comment on function estoque.calcular_kits_possiveis(uuid, uuid) is
  'Kits possíveis de um tipo de kit DENTRO de um empreendimento (saldo segmentado).';

-- produzir_lote: agora consome do estoque do empreendimento (obrigatório).
create or replace function estoque.produzir_lote(
  p_tipo_kit_id       uuid,
  p_quantidade        integer,
  p_empreendimento_id uuid default null,
  p_local_id          uuid default null
)
returns estoque.lote
language plpgsql
set search_path = ''
as $$
declare
  v_lote      estoque.lote;
  v_possiveis bigint;
  v_gargalo   text;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;
  if p_empreendimento_id is null then
    raise exception 'Empreendimento é obrigatório para produzir (estoque é por empreendimento).';
  end if;

  -- serializa produções concorrentes do mesmo insumo
  perform 1
  from estoque.insumo i
  where i.id in (
    select c.insumo_id from estoque.composicao c where c.tipo_kit_id = p_tipo_kit_id
  )
  for update;

  select qtd_possivel, insumo_gargalo_nome
    into v_possiveis, v_gargalo
    from estoque.calcular_kits_possiveis(p_tipo_kit_id, p_empreendimento_id);

  if v_possiveis < p_quantidade then
    raise exception
      'Insumo insuficiente neste empreendimento: dá para % kit(s); gargalo: %. Solicitado: %.',
      v_possiveis, coalesce(v_gargalo, 'BOM vazio'), p_quantidade;
  end if;

  insert into estoque.lote (tipo_kit_id, empreendimento_id, quantidade)
  values (p_tipo_kit_id, p_empreendimento_id, p_quantidade)
  returning * into v_lote;

  insert into estoque.movimentacao
    (tipo, insumo_id, lote_id, local_id, empreendimento_id, quantidade, usuario_id, observacao)
  select
    'baixa_producao', c.insumo_id, v_lote.id, p_local_id, p_empreendimento_id,
    -(c.quantidade * p_quantidade), auth.uid(), 'Baixa automática pelo BOM'
  from estoque.composicao c
  where c.tipo_kit_id = p_tipo_kit_id;

  insert into estoque.unidade_kit (lote_id, numero, qr_code, local_id)
  select v_lote.id, nextval('estoque.seq_numero_kit'), gen_random_uuid()::text, p_local_id
  from generate_series(1, p_quantidade);

  return v_lote;
end;
$$;
