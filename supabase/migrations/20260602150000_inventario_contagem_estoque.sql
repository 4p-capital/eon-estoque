-- Inventário / contagem de estoque (saldo de abertura + conferência periódica).
-- Uma contagem é feita por empreendimento. Ao aplicar, o sistema compara a
-- quantidade contada com o saldo atual (soma das movimentações) e lança um
-- ajuste no livro-razão (movimentacao tipo 'ajuste' = contado - saldo).
-- Serve tanto para o saldo de abertura (saldo 0 → vira o contado) quanto para
-- a conferência física × sistema periódica.

-- ── Sessão de contagem ───────────────────────────────────────────────────────
create table estoque.contagem (
  id                uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references estoque.empreendimento(id) on delete restrict,
  regiao            text,                       -- região do galpão (texto livre, opcional)
  status            text not null default 'aberta'
                    check (status in ('aberta', 'aplicada', 'cancelada')),
  observacao        text,
  criado_por        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  aplicada_em       timestamptz,
  aplicada_por      uuid references auth.users(id) on delete set null
);

create index idx_contagem_empreendimento on estoque.contagem (empreendimento_id);
create index idx_contagem_criado_por on estoque.contagem (criado_por);
create index idx_contagem_aplicada_por on estoque.contagem (aplicada_por);

-- ── Itens contados ───────────────────────────────────────────────────────────
create table estoque.contagem_item (
  id            uuid primary key default gen_random_uuid(),
  contagem_id   uuid not null references estoque.contagem(id) on delete cascade,
  insumo_id     uuid not null references estoque.insumo(id) on delete restrict,
  qtd_contada   numeric(14,3) not null check (qtd_contada >= 0),
  saldo_sistema numeric(14,3),                  -- snapshot do saldo no momento da aplicação
  created_at    timestamptz not null default now(),
  unique (contagem_id, insumo_id)
);

create index idx_contagem_item_contagem on estoque.contagem_item (contagem_id);
create index idx_contagem_item_insumo on estoque.contagem_item (insumo_id);

-- ── RLS (consistente com o resto do schema: authenticated all; papéis depois) ─
alter table estoque.contagem enable row level security;
alter table estoque.contagem_item enable row level security;

create policy "contagem_authenticated_all" on estoque.contagem
  for all to authenticated using (true) with check (true);
create policy "contagem_item_authenticated_all" on estoque.contagem_item
  for all to authenticated using (true) with check (true);

-- ── View de resumo (security_invoker p/ respeitar a RLS) ──────────────────────
create view estoque.contagem_resumo with (security_invoker = true) as
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
  coalesce(sum(ci.qtd_contada - coalesce(ci.saldo_sistema, 0)), 0) as diferenca_total
from estoque.contagem c
join estoque.empreendimento e on e.id = c.empreendimento_id
left join estoque.contagem_item ci on ci.contagem_id = c.id
group by c.id, e.nome;

-- ── RPC atômica: aplica a contagem lançando os ajustes no livro-razão ─────────
create or replace function estoque.aplicar_contagem(p_contagem_id uuid)
returns void
language plpgsql
security invoker
set search_path = estoque, public
as $$
declare
  v_emp    uuid;
  v_status text;
  v_item   record;
  v_saldo  numeric(14,3);
  v_diff   numeric(14,3);
begin
  select empreendimento_id, status into v_emp, v_status
  from estoque.contagem
  where id = p_contagem_id
  for update;

  if v_emp is null then
    raise exception 'Contagem não encontrada.';
  end if;
  if v_status <> 'aberta' then
    raise exception 'Esta contagem já foi % e não pode ser aplicada novamente.', v_status;
  end if;

  for v_item in
    select id, insumo_id, qtd_contada
    from estoque.contagem_item
    where contagem_id = p_contagem_id
  loop
    -- saldo atual do insumo neste empreendimento (livro-razão)
    select coalesce(sum(quantidade), 0) into v_saldo
    from estoque.movimentacao
    where insumo_id = v_item.insumo_id
      and empreendimento_id = v_emp;

    -- guarda o snapshot do saldo no momento da aplicação
    update estoque.contagem_item set saldo_sistema = v_saldo where id = v_item.id;

    -- só lança ajuste quando há diferença
    v_diff := v_item.qtd_contada - v_saldo;
    if v_diff <> 0 then
      insert into estoque.movimentacao
        (tipo, insumo_id, empreendimento_id, quantidade, usuario_id, observacao)
      values
        ('ajuste', v_item.insumo_id, v_emp, v_diff, auth.uid(),
         'Ajuste de inventário (contagem ' || p_contagem_id || ')');
    end if;
  end loop;

  update estoque.contagem
  set status = 'aplicada', aplicada_em = now(), aplicada_por = auth.uid()
  where id = p_contagem_id;
end;
$$;

-- ── Grants (novas tabelas/view/função) ───────────────────────────────────────
grant all on estoque.contagem, estoque.contagem_item to authenticated, service_role;
grant select on estoque.contagem_resumo to authenticated, service_role;
grant execute on function estoque.aplicar_contagem(uuid) to authenticated, service_role;
