-- ============================================================================
-- Inteligência do estoque + operações transacionais (schema `estoque`)
--   1. Kits possíveis (cálculo do gargalo)
--   2. Ponto de pedido (quando comprar)
--   3. produzir_lote   (baixa BOM + cria unidades + gera QR, atômico)
--   4. registrar_saida_kit (bipagem do QR na saída)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Kits possíveis de UM tipo de kit.
--    Para cada insumo da receita: floor(saldo / consumo_por_kit).
--    O resultado é o MENOR desses números — o insumo gargalo trava a produção.
-- ---------------------------------------------------------------------------
create or replace function estoque.calcular_kits_possiveis(p_tipo_kit_id uuid)
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
      floor(s.saldo / c.quantidade)::bigint as limite
    from estoque.composicao c
    join estoque.insumo i       on i.id = c.insumo_id
    join estoque.saldo_insumo s on s.insumo_id = c.insumo_id
    where c.tipo_kit_id = p_tipo_kit_id
  ),
  -- gargalo num único subselect com tiebreak determinístico (insumo_id):
  -- evita id e nome virem de insumos diferentes em caso de empate de limite.
  gargalo as (
    select insumo_id, insumo_nome
    from limites
    order by limite asc, insumo_id asc
    limit 1
  )
  select
    coalesce((select min(limite) from limites), 0) as qtd_possivel,
    (select insumo_id   from gargalo)              as insumo_gargalo_id,
    (select insumo_nome from gargalo)              as insumo_gargalo_nome;
$$;

comment on function estoque.calcular_kits_possiveis is
  'Quantos kits dá para montar agora; aponta o insumo gargalo (menor limite).';

-- View com kits possíveis de TODOS os tipos de kit (para o dashboard).
create or replace view estoque.kits_possiveis_view with (security_invoker = true) as
select
  tk.id   as tipo_kit_id,
  tk.nome as tipo_kit_nome,
  kp.qtd_possivel,
  kp.insumo_gargalo_id,
  kp.insumo_gargalo_nome
from estoque.tipo_kit tk
cross join lateral estoque.calcular_kits_possiveis(tk.id) kp;

-- ---------------------------------------------------------------------------
-- 2. Ponto de pedido por insumo.
--    ponto = (consumo_dia * lead_time_dias) + estoque_seguranca
--    precisa_comprar quando o saldo cruza esse nível.
-- ---------------------------------------------------------------------------
create or replace view estoque.ponto_de_pedido_view with (security_invoker = true) as
select
  s.insumo_id,
  s.nome,
  s.unidade,
  s.saldo,
  s.consumo_dia,
  s.lead_time_dias,
  s.estoque_min,
  (s.consumo_dia * s.lead_time_dias + s.estoque_min) as ponto_pedido,
  (s.saldo <= (s.consumo_dia * s.lead_time_dias + s.estoque_min)) as precisa_comprar,
  -- sugestão simples: repor o consumo do lead time + folga, descontando o saldo
  greatest(
    ceil((s.consumo_dia * s.lead_time_dias + s.estoque_min) - s.saldo),
    0
  ) as sugestao_compra
from estoque.saldo_insumo s;

comment on view estoque.ponto_de_pedido_view is
  'Alerta de compra: precisa_comprar = saldo <= consumo_dia*lead_time + estoque_min.';

-- ---------------------------------------------------------------------------
-- 3. Produzir um lote (operação atômica).
--    - valida se há insumo suficiente (não deixa estoque negativo);
--    - cria o lote;
--    - baixa os insumos pelo BOM (uma movimentação por insumo);
--    - cria N unidades_kit, cada uma com número sequencial e QR único.
--    Retorna o lote criado.
-- ---------------------------------------------------------------------------
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

  -- Serializa produções concorrentes do mesmo insumo: trava as linhas de insumo
  -- do BOM ANTES de ler o saldo. Sem o lock, duas produções simultâneas leem o
  -- mesmo saldo, ambas passam na validação e baixam -> estoque negativo (o que o
  -- sistema anti-furto precisa recusar). A 2ª transação só prossegue após a 1ª
  -- commitar, e aí enxerga o saldo já atualizado.
  perform 1
  from estoque.insumo i
  where i.id in (
    select c.insumo_id from estoque.composicao c where c.tipo_kit_id = p_tipo_kit_id
  )
  for update;

  -- valida estoque pelo gargalo (já sob lock)
  select qtd_possivel, insumo_gargalo_nome
    into v_possiveis, v_gargalo
    from estoque.calcular_kits_possiveis(p_tipo_kit_id);

  if v_possiveis < p_quantidade then
    raise exception
      'Insumo insuficiente: dá para % kit(s); gargalo: %. Solicitado: %.',
      v_possiveis, coalesce(v_gargalo, 'BOM vazio'), p_quantidade;
  end if;

  -- cria o lote
  insert into estoque.lote (tipo_kit_id, empreendimento_id, quantidade)
  values (p_tipo_kit_id, p_empreendimento_id, p_quantidade)
  returning * into v_lote;

  -- baixa os insumos pelo BOM (quantidade negativa = saída)
  insert into estoque.movimentacao (tipo, insumo_id, lote_id, local_id, quantidade, usuario_id, observacao)
  select
    'baixa_producao',
    c.insumo_id,
    v_lote.id,
    p_local_id,
    -(c.quantidade * p_quantidade),
    auth.uid(),
    'Baixa automática pelo BOM'
  from estoque.composicao c
  where c.tipo_kit_id = p_tipo_kit_id;

  -- cria as unidades físicas, cada uma com número e QR únicos
  insert into estoque.unidade_kit (lote_id, numero, qr_code, local_id)
  select
    v_lote.id,
    nextval('estoque.seq_numero_kit'),
    gen_random_uuid()::text,
    p_local_id
  from generate_series(1, p_quantidade);

  return v_lote;
end;
$$;

comment on function estoque.produzir_lote is
  'Cria lote + baixa insumos pelo BOM + gera N unidades com QR. Atômico.';

-- ---------------------------------------------------------------------------
-- 4. Registrar saída de um kit pela bipagem do QR.
--    - acha a unidade pelo QR;
--    - recusa se já saiu (evita baixa dupla / etiqueta duplicada);
--    - muda status e registra a movimentação de saída (quem, quando, destino).
--    Retorna a unidade atualizada.
-- ---------------------------------------------------------------------------
create or replace function estoque.registrar_saida_kit(
  p_qr_code           text,
  p_local_destino_id  uuid default null,
  p_observacao        text default null
)
returns estoque.unidade_kit
language plpgsql
set search_path = ''
as $$
declare
  v_unidade estoque.unidade_kit;
begin
  select * into v_unidade
  from estoque.unidade_kit
  where qr_code = p_qr_code
  for update;

  if not found then
    raise exception 'QR não encontrado: %', p_qr_code;
  end if;

  if v_unidade.status <> 'em_estoque' then
    raise exception 'Kit % já saiu (status: %). Baixa dupla recusada.',
      v_unidade.numero, v_unidade.status;
  end if;

  update estoque.unidade_kit
     set status = 'expedido'
   where id = v_unidade.id
  returning * into v_unidade;

  insert into estoque.movimentacao
    (tipo, unidade_kit_id, lote_id, local_id, quantidade, usuario_id, observacao)
  values
    ('saida_kit', v_unidade.id, v_unidade.lote_id, p_local_destino_id, -1, auth.uid(), p_observacao);

  return v_unidade;
end;
$$;

comment on function estoque.registrar_saida_kit is
  'Bipagem do QR na saída: baixa o kit, registra usuário/hora/destino, recusa baixa dupla.';
