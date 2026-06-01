-- ============================================================================
-- Notas fiscais persistidas + recebimento com conferência/divergência +
-- trilha de eventos (anti-furto). As RPCs gravam o evento na MESMA transação.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Nota fiscal (cabeçalho) e seus itens
-- ---------------------------------------------------------------------------
create table estoque.nota_fiscal (
  id                uuid primary key default gen_random_uuid(),
  chave             text not null unique,
  spe_id            uuid references estoque.spe(id) on delete set null,
  empreendimento_id uuid references estoque.empreendimento(id) on delete set null,
  emitente_cnpj     text,
  emitente_nome     text,
  numero            text,
  serie             text,
  valor_total       numeric(14,2),
  data_emissao      timestamptz,
  status            text not null default 'consultada'
                    check (status in ('consultada','recebida','recebida_divergencia','recusada')),
  motivo_recusa     text,
  xml               text,
  recebido_por      uuid references auth.users(id) on delete set null,
  recebido_em       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_nf_spe on estoque.nota_fiscal (spe_id);
create index idx_nf_empreendimento on estoque.nota_fiscal (empreendimento_id);
create index idx_nf_status on estoque.nota_fiscal (status);

create trigger trg_nota_fiscal_updated_at
  before update on estoque.nota_fiscal
  for each row execute function estoque.touch_updated_at();

create table estoque.nota_item (
  id                   uuid primary key default gen_random_uuid(),
  nota_id              uuid not null references estoque.nota_fiscal(id) on delete cascade,
  num_item             integer not null,
  codigo_fornecedor    text,
  descricao            text,
  ncm                  text,
  cfop                 text,
  unidade              text,
  quantidade           numeric(14,4) not null,
  valor_unitario       numeric(14,4),
  valor_total          numeric(14,2),
  ean                  text,
  insumo_id            uuid references estoque.insumo(id) on delete set null,
  fator_conversao      numeric(14,3) not null default 1,
  quantidade_recebida  numeric(14,4),
  created_at           timestamptz not null default now(),
  unique (nota_id, num_item)
);

create index idx_ni_nota on estoque.nota_item (nota_id);
create index idx_ni_insumo on estoque.nota_item (insumo_id);

-- Rastreio: de qual item de nota veio cada entrada no livro-razão.
alter table estoque.movimentacao
  add column nota_item_id uuid references estoque.nota_item(id) on delete set null;
create index idx_mov_nota_item on estoque.movimentacao (nota_item_id);

-- ---------------------------------------------------------------------------
-- Trilha de eventos (relatórios / auditoria anti-furto)
-- ---------------------------------------------------------------------------
create table estoque.evento (
  id                uuid primary key default gen_random_uuid(),
  tipo              text not null
                    check (tipo in ('recebimento','recebimento_divergencia','recusa_nota','mapeamento_insumo')),
  nota_id           uuid references estoque.nota_fiscal(id) on delete set null,
  empreendimento_id uuid references estoque.empreendimento(id) on delete set null,
  usuario_id        uuid references auth.users(id) on delete set null,
  descricao         text not null,
  dados             jsonb,
  created_at        timestamptz not null default now()
);

create index idx_evento_tipo on estoque.evento (tipo);
create index idx_evento_nota on estoque.evento (nota_id);
create index idx_evento_empreendimento on estoque.evento (empreendimento_id);
create index idx_evento_created on estoque.evento (created_at desc);

comment on table estoque.evento is
  'Trilha de auditoria de ações de negócio (recebimento, divergência, recusa) para relatórios anti-furto.';

-- ---------------------------------------------------------------------------
-- RLS (padrão do schema: qualquer autenticado)
-- ---------------------------------------------------------------------------
alter table estoque.nota_fiscal enable row level security;
alter table estoque.nota_item   enable row level security;
alter table estoque.evento      enable row level security;

create policy "auth_all_nota_fiscal" on estoque.nota_fiscal for all to authenticated using (true) with check (true);
create policy "auth_all_nota_item"   on estoque.nota_item   for all to authenticated using (true) with check (true);
create policy "auth_all_evento"      on estoque.evento       for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- RPC: receber a nota (atômica). p_itens = [{nota_item_id, recebido}, ...]
--   - valida recebido em [0, quantidade da nota];
--   - item com recebido > 0 precisa estar mapeado a um insumo;
--   - gera entrada_insumo (quantidade * fator) no estoque do empreendimento;
--   - marca divergência quando algum recebido < quantidade;
--   - grava o EVENTO na mesma transação.
-- ---------------------------------------------------------------------------
create or replace function estoque.receber_nota(
  p_nota_id  uuid,
  p_itens    jsonb,
  p_local_id uuid default null
)
returns estoque.nota_fiscal
language plpgsql
set search_path = ''
as $$
declare
  v_nota         estoque.nota_fiscal;
  v_item         estoque.nota_item;
  v_payload      record;
  v_divergente   boolean := false;
  v_divergencias jsonb := '[]'::jsonb;
begin
  select * into v_nota from estoque.nota_fiscal where id = p_nota_id for update;
  if not found then
    raise exception 'Nota não encontrada.';
  end if;
  if v_nota.status <> 'consultada' then
    raise exception 'Esta nota já foi processada (status: %).', v_nota.status;
  end if;
  if v_nota.empreendimento_id is null then
    raise exception 'Nota sem empreendimento vinculado — verifique o cadastro da SPE.';
  end if;

  for v_payload in
    select (e->>'nota_item_id')::uuid as nota_item_id,
           (e->>'recebido')::numeric  as recebido
    from jsonb_array_elements(p_itens) e
  loop
    select * into v_item from estoque.nota_item
      where id = v_payload.nota_item_id and nota_id = p_nota_id;
    if not found then
      raise exception 'Item informado não pertence a esta nota.';
    end if;
    if v_payload.recebido < 0 or v_payload.recebido > v_item.quantidade then
      raise exception 'Quantidade recebida inválida no item % (máximo % da nota).',
        v_item.num_item, v_item.quantidade;
    end if;
    if v_payload.recebido > 0 and v_item.insumo_id is null then
      raise exception 'Item % (%) não está mapeado a um insumo — mapeie antes de receber.',
        v_item.num_item, coalesce(v_item.descricao, '');
    end if;

    update estoque.nota_item set quantidade_recebida = v_payload.recebido where id = v_item.id;

    if v_item.insumo_id is not null and v_payload.recebido > 0 then
      insert into estoque.movimentacao
        (tipo, insumo_id, empreendimento_id, local_id, nota_item_id, quantidade, usuario_id, observacao)
      values
        ('entrada_insumo', v_item.insumo_id, v_nota.empreendimento_id, p_local_id, v_item.id,
         v_payload.recebido * v_item.fator_conversao, auth.uid(),
         'Entrada via NF-e ' || coalesce(v_nota.numero, ''));
    end if;

    if v_payload.recebido < v_item.quantidade then
      v_divergente := true;
      v_divergencias := v_divergencias || jsonb_build_object(
        'num_item', v_item.num_item,
        'descricao', v_item.descricao,
        'esperado', v_item.quantidade,
        'recebido', v_payload.recebido,
        'falta', v_item.quantidade - v_payload.recebido
      );
    end if;
  end loop;

  update estoque.nota_fiscal
     set status = case when v_divergente then 'recebida_divergencia' else 'recebida' end,
         recebido_por = auth.uid(),
         recebido_em = now()
   where id = p_nota_id
   returning * into v_nota;

  insert into estoque.evento (tipo, nota_id, empreendimento_id, usuario_id, descricao, dados)
  values (
    case when v_divergente then 'recebimento_divergencia' else 'recebimento' end,
    p_nota_id, v_nota.empreendimento_id, auth.uid(),
    case when v_divergente
      then 'Recebimento COM DIVERGÊNCIA da nota ' || coalesce(v_nota.numero, '')
      else 'Recebimento conforme da nota ' || coalesce(v_nota.numero, '') end,
    jsonb_build_object('divergencias', v_divergencias)
  );

  return v_nota;
end;
$$;

comment on function estoque.receber_nota is
  'Recebe a nota: valida qty, gera entrada por empreendimento, marca divergência e registra evento. Atômico.';

-- ---------------------------------------------------------------------------
-- RPC: recusar a nota inteira (sem movimentar estoque). Registra evento.
-- ---------------------------------------------------------------------------
create or replace function estoque.recusar_nota(p_nota_id uuid, p_motivo text)
returns estoque.nota_fiscal
language plpgsql
set search_path = ''
as $$
declare
  v_nota estoque.nota_fiscal;
begin
  select * into v_nota from estoque.nota_fiscal where id = p_nota_id for update;
  if not found then
    raise exception 'Nota não encontrada.';
  end if;
  if v_nota.status <> 'consultada' then
    raise exception 'Esta nota já foi processada (status: %).', v_nota.status;
  end if;
  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'Informe o motivo da recusa.';
  end if;

  update estoque.nota_fiscal
     set status = 'recusada', motivo_recusa = p_motivo, recebido_por = auth.uid(), recebido_em = now()
   where id = p_nota_id
   returning * into v_nota;

  insert into estoque.evento (tipo, nota_id, empreendimento_id, usuario_id, descricao, dados)
  values ('recusa_nota', p_nota_id, v_nota.empreendimento_id, auth.uid(),
          'Recusa da nota ' || coalesce(v_nota.numero, ''), jsonb_build_object('motivo', p_motivo));

  return v_nota;
end;
$$;

comment on function estoque.recusar_nota is
  'Recusa a entrega inteira: marca recusada com motivo, sem movimentar estoque, registra evento.';
