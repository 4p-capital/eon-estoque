-- ============================================================================
-- criar_kit_com_bom — cadastro kit-cêntrico (atômico).
--   Cria o tipo_kit, e para cada item do BOM:
--     - se vier insumo_id -> usa o insumo existente;
--     - senão, tenta casar por nome (case-insensitive) p/ não duplicar;
--     - se ainda não existir, cria o insumo (nome + unidade);
--   e amarra a composicao (tipo_kit + insumo + quantidade).
--   Tudo numa transação: se qualquer linha falhar, nada é gravado.
--
-- p_itens: jsonb array de
--   { "insumo_id": uuid|null, "nome": text, "unidade": text, "quantidade": number }
-- ============================================================================
create or replace function estoque.criar_kit_com_bom(
  p_nome      text,
  p_descricao text,
  p_itens     jsonb
)
returns estoque.tipo_kit
language plpgsql
set search_path = ''
as $$
declare
  v_kit       estoque.tipo_kit;
  v_item      jsonb;
  v_insumo_id uuid;
  v_qtd       numeric;
  v_nome      text;
  v_unidade   text;
begin
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome do kit.';
  end if;
  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'O kit precisa de ao menos um insumo.';
  end if;

  insert into estoque.tipo_kit (nome, descricao)
  values (trim(p_nome), nullif(trim(coalesce(p_descricao, '')), ''))
  returning * into v_kit;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_qtd := (v_item->>'quantidade')::numeric;
    if v_qtd is null or v_qtd <= 0 then
      raise exception 'Quantidade inválida para um insumo do kit.';
    end if;

    v_insumo_id := nullif(v_item->>'insumo_id', '')::uuid;
    v_nome      := trim(coalesce(v_item->>'nome', ''));
    v_unidade   := trim(coalesce(v_item->>'unidade', ''));

    if v_insumo_id is null then
      -- rede de segurança: reaproveita insumo de mesmo nome antes de criar
      select id into v_insumo_id
      from estoque.insumo
      where lower(nome) = lower(v_nome)
      limit 1;

      if v_insumo_id is null then
        if v_nome = '' or v_unidade = '' then
          raise exception 'Insumo novo precisa de nome e unidade.';
        end if;
        insert into estoque.insumo (nome, unidade)
        values (v_nome, v_unidade)
        returning id into v_insumo_id;
      end if;
    end if;

    insert into estoque.composicao (tipo_kit_id, insumo_id, quantidade)
    values (v_kit.id, v_insumo_id, v_qtd)
    on conflict (tipo_kit_id, insumo_id) do update set quantidade = excluded.quantidade;
  end loop;

  return v_kit;
end;
$$;

comment on function estoque.criar_kit_com_bom is
  'Cadastro kit-cêntrico atômico: cria kit + insumos novos + composição (BOM).';
