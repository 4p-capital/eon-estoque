-- ============================================================================
-- editar_kit_com_bom — edição kit-cêntrica (atômica).
--   Atualiza nome/descrição do kit e SUBSTITUI a composição (BOM) pelo conteúdo
--   enviado: apaga as linhas atuais e regrava a partir de p_itens (mesma lógica
--   de resolver/criar insumo do criar_kit_com_bom, deduplicando por nome).
--   Tudo numa transação: se algo falhar, o kit fica como estava.
--
--   Editar o BOM NÃO afeta lotes já produzidos (eles já baixaram o estoque na
--   produção); a composição é só a receita para produções futuras.
-- ============================================================================
create or replace function estoque.editar_kit_com_bom(
  p_kit_id    uuid,
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

  update estoque.tipo_kit
     set nome = trim(p_nome),
         descricao = nullif(trim(coalesce(p_descricao, '')), '')
   where id = p_kit_id
  returning * into v_kit;

  if not found then
    raise exception 'Kit não encontrado.';
  end if;

  -- substitui o BOM inteiro
  delete from estoque.composicao where tipo_kit_id = p_kit_id;

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
    values (p_kit_id, v_insumo_id, v_qtd)
    on conflict (tipo_kit_id, insumo_id) do update set quantidade = excluded.quantidade;
  end loop;

  return v_kit;
end;
$$;

comment on function estoque.editar_kit_com_bom is
  'Edição kit-cêntrica atômica: atualiza kit + substitui a composição (BOM).';
