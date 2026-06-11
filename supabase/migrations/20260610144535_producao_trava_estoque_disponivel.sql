-- ============================================================================
-- Trava de estoque ANTES de imprimir etiquetas.
--
-- Problema: no lote vivo a baixa do BOM só acontece no bipe de entrada
-- (registrar_entrada_kit). A única validação de saldo era lá — DEPOIS de
-- gerar/imprimir/colar as etiquetas nos kits físicos. Etiqueta colada que não
-- bipa = retrabalho.
--
-- Conceito novo: DISPONÍVEL = saldo − reservado, onde "reservado" é o consumo
-- futuro das etiquetas 'pendente' (já impressas, ainda não bipadas) daquela
-- SPE. gerar_etiquetas passa a BLOQUEAR quando a quantidade pedida excede o
-- disponível — nomeando o insumo gargalo. (Nota: o bipe em si não altera o
-- disponível — ele baixa o saldo e libera a reserva na mesma medida.)
--
-- Locks: gerar_etiquetas adota o mesmo lock de insumos do BOM (for update) já
-- usado por registrar_entrada_kit/produzir_lote, serializando geração × bipe ×
-- transferência concorrentes dos mesmos insumos.
-- ============================================================================

-- ── 1. saldo_insumo_disponivel: saldo − reservado por insumo × empreendimento ─
-- FULL JOIN: um insumo pode ter reserva sem nenhuma movimentação naquela SPE
-- (saldo 0) — precisa aparecer com disponível negativo, não sumir.
create view estoque.saldo_insumo_disponivel with (security_invoker = true) as
with reservado as (
  select
    c.insumo_id,
    l.empreendimento_id,
    l.tenant_id,
    sum(c.quantidade) as reservado
  from estoque.unidade_kit uk
  join estoque.lote l on l.id = uk.lote_id
  join estoque.composicao c on c.tipo_kit_id = l.tipo_kit_id
  where uk.status = 'pendente'
    and l.empreendimento_id is not null
  group by c.insumo_id, l.empreendimento_id, l.tenant_id
)
select
  coalesce(s.insumo_id, r.insumo_id)                 as insumo_id,
  coalesce(s.empreendimento_id, r.empreendimento_id) as empreendimento_id,
  i.nome,
  i.unidade,
  coalesce(s.saldo, 0)                               as saldo,
  coalesce(r.reservado, 0)                           as reservado,
  coalesce(s.saldo, 0) - coalesce(r.reservado, 0)    as disponivel,
  coalesce(s.tenant_id, r.tenant_id)                 as tenant_id
from estoque.saldo_insumo_empreendimento s
full join reservado r
  on r.insumo_id = s.insumo_id and r.empreendimento_id = s.empreendimento_id
join estoque.insumo i on i.id = coalesce(s.insumo_id, r.insumo_id);

comment on view estoque.saldo_insumo_disponivel is
  'Disponível por insumo × empreendimento = saldo − reservado (BOM das etiquetas pendentes).';

-- ── 2. bom_disponibilidade: detalhe por insumo do BOM (alimenta UI/drawer) ───
create or replace function estoque.bom_disponibilidade(
  p_tipo_kit_id uuid, p_empreendimento_id uuid
)
returns table (
  insumo_id    uuid,
  insumo_nome  text,
  unidade      text,
  qtd_por_kit  numeric,
  saldo        numeric,
  reservado    numeric,
  disponivel   numeric,
  limite       bigint
)
language sql
stable
set search_path = ''
as $$
  select
    c.insumo_id,
    i.nome,
    i.unidade,
    c.quantidade,
    coalesce(d.saldo, 0),
    coalesce(d.reservado, 0),
    coalesce(d.disponivel, 0),
    greatest(floor(coalesce(d.disponivel, 0) / c.quantidade), 0)::bigint
  from estoque.composicao c
  join estoque.insumo i on i.id = c.insumo_id
  left join estoque.saldo_insumo_disponivel d
    on d.insumo_id = c.insumo_id and d.empreendimento_id = p_empreendimento_id
  where c.tipo_kit_id = p_tipo_kit_id
$$;

comment on function estoque.bom_disponibilidade(uuid, uuid) is
  'BOM de um tipo de kit com saldo/reservado/disponível e limite de kits por insumo numa SPE.';

-- ── 3. calcular_kits_disponiveis: agregado (min) + insumo gargalo ────────────
create or replace function estoque.calcular_kits_disponiveis(
  p_tipo_kit_id uuid, p_empreendimento_id uuid
)
returns table (
  qtd_disponivel      bigint,
  insumo_gargalo_id   uuid,
  insumo_gargalo_nome text
)
language sql
stable
set search_path = ''
as $$
  with b as (
    select * from estoque.bom_disponibilidade(p_tipo_kit_id, p_empreendimento_id)
  ),
  gargalo as (
    select insumo_id, insumo_nome from b order by limite asc, insumo_id asc limit 1
  )
  select
    coalesce((select min(limite) from b), 0) as qtd_disponivel,
    (select insumo_id   from gargalo),
    (select insumo_nome from gargalo);
$$;

comment on function estoque.calcular_kits_disponiveis(uuid, uuid) is
  'Quantos kits a SPE ainda comporta IMPRIMIR (disponível = saldo − reservado por pendentes).';

-- ── 4. gerar_etiquetas: agora BLOQUEIA acima do disponível ───────────────────
create or replace function estoque.gerar_etiquetas(p_lote_id uuid, p_quantidade integer)
returns setof estoque.unidade_kit language plpgsql set search_path = '' as $$
declare v_lote estoque.lote; v_disponiveis bigint; v_gargalo text;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade de etiquetas deve ser maior que zero.'; end if;
  select * into v_lote from estoque.lote where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  if v_lote.status <> 'aberto' then
    raise exception 'Lote está % e não aceita novas etiquetas (apenas lotes abertos).', v_lote.status; end if;
  if v_lote.empreendimento_id is null then
    raise exception 'Lote sem empreendimento não pode gerar etiquetas (estoque é por empreendimento).'; end if;
  -- serializa com bipes/transferências concorrentes dos mesmos insumos.
  -- order by: ordem de lock estável evita deadlock entre BOMs sobrepostos.
  perform 1 from estoque.insumo i
   where i.id in (select c.insumo_id from estoque.composicao c where c.tipo_kit_id = v_lote.tipo_kit_id)
   order by i.id
   for update;
  select qtd_disponivel, insumo_gargalo_nome into v_disponiveis, v_gargalo
    from estoque.calcular_kits_disponiveis(v_lote.tipo_kit_id, v_lote.empreendimento_id);
  if v_disponiveis < p_quantidade then
    raise exception
      'Estoque insuficiente: o empreendimento comporta % etiqueta(s) (descontando as pendentes); gargalo: %. Solicitado: %. Transfira insumo de outra SPE ou reduza a quantidade.',
      v_disponiveis, coalesce(v_gargalo, 'BOM sem insumos cadastrados'), p_quantidade; end if;
  return query
  insert into estoque.unidade_kit (lote_id, numero, qr_code, status, impressa_em)
  select p_lote_id, nextval('estoque.seq_numero_kit'), gen_random_uuid()::text, 'pendente', now()
  from generate_series(1, p_quantidade) returning *;
end; $$;
comment on function estoque.gerar_etiquetas(uuid,integer) is
  'Gera N unidades pendentes para lote aberto. BLOQUEIA acima do disponível (saldo − reservado), nomeando o gargalo. SEM baixa de BOM (baixa é no bipe).';

-- ── 5. registrar_entrada_kit: mesma ordem de lock (anti-deadlock) ────────────
-- Única mudança vs. 20260603202309: ORDER BY i.id no lock dos insumos do BOM.
-- Com gerar_etiquetas agora também travando insumos, ordem estável entre as
-- funções concorrentes evita deadlock em BOMs sobrepostos.
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
  -- serializa entradas concorrentes do mesmo insumo (ordem estável anti-deadlock).
  perform 1 from estoque.insumo i
   where i.id in (select c.insumo_id from estoque.composicao c where c.tipo_kit_id = v_tipo_kit)
   order by i.id
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
  'Bipe de entrada: pendente→em_estoque, baixa BOM de 1 kit e registra entrada (+1). Atômico, anti baixa dupla, lock ordenado.';

-- ── 6. Grants ─────────────────────────────────────────────────────────────────
grant select on estoque.saldo_insumo_disponivel to authenticated, service_role;
grant execute on function estoque.bom_disponibilidade(uuid,uuid)       to authenticated, service_role;
grant execute on function estoque.calcular_kits_disponiveis(uuid,uuid) to authenticated, service_role;
