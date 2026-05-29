-- ============================================================================
-- Seed de exemplo — reproduz o cenário discutido na reunião.
-- Estoque inicial: fio 4.500 m, disjuntor 380 un, caixa 900 un.
-- Kit elétrico consome 10 m de fio + 1 disjuntor + 2 caixas.
--   fio:      4500 / 10 = 450 kits
--   disjuntor: 380 / 1  = 380 kits   <- GARGALO
--   caixa:     900 / 2  = 450 kits
-- => kits possíveis = 380 (limitado pelo disjuntor).
-- ============================================================================

do $$
declare
  v_local_eon  uuid;
  v_emp_toc    uuid;
  v_fio        uuid;
  v_disjuntor  uuid;
  v_caixa      uuid;
  v_tubo       uuid;
  v_conexao    uuid;
  v_kit_eletr  uuid;
  v_kit_hidr   uuid;
begin
  -- Locais
  insert into local (nome, is_padrao) values ('EON Instalações', true)
    returning id into v_local_eon;

  -- Empreendimento
  insert into empreendimento (nome, qtd_apartamentos) values ('TOC', 450)
    returning id into v_emp_toc;

  -- Insumos (com lead time e consumo/dia para o ponto de pedido)
  insert into insumo (nome, unidade, estoque_min, lead_time_dias, consumo_dia)
    values ('Fio flexível 2,5mm', 'm', 500, 7, 100) returning id into v_fio;
  insert into insumo (nome, unidade, estoque_min, lead_time_dias, consumo_dia)
    values ('Disjuntor 20A', 'un', 50, 10, 15) returning id into v_disjuntor;
  insert into insumo (nome, unidade, estoque_min, lead_time_dias, consumo_dia)
    values ('Caixa de luz 4x2', 'un', 100, 5, 30) returning id into v_caixa;
  insert into insumo (nome, unidade, estoque_min, lead_time_dias, consumo_dia)
    values ('Tubo PVC 25mm', 'm', 300, 7, 40) returning id into v_tubo;
  insert into insumo (nome, unidade, estoque_min, lead_time_dias, consumo_dia)
    values ('Conexão PVC 25mm', 'un', 80, 7, 20) returning id into v_conexao;

  -- De-Para de fornecedor (apelidos / EAN -> insumo interno)
  insert into de_para_fornecedor (insumo_id, descricao_fornecedor, codigo_ean, fator_conversao)
    values (v_fio, 'FIO FLEX 2,5MM ROLO 100M', '7891234567890', 100);
  insert into de_para_fornecedor (insumo_id, descricao_fornecedor, codigo_ean)
    values (v_disjuntor, 'DISJ MONO 20A CURVA C', '7899876543210');

  -- Tipos de kit (receitas)
  insert into tipo_kit (nome, descricao) values ('Kit Elétrico Padrão', 'Instalação elétrica de 1 apartamento')
    returning id into v_kit_eletr;
  insert into tipo_kit (nome, descricao) values ('Kit Hidráulico Padrão', 'Instalação hidráulica de 1 apartamento')
    returning id into v_kit_hidr;

  -- BOM — Kit Elétrico: 10 m fio + 1 disjuntor + 2 caixas
  insert into composicao (tipo_kit_id, insumo_id, quantidade) values
    (v_kit_eletr, v_fio, 10),
    (v_kit_eletr, v_disjuntor, 1),
    (v_kit_eletr, v_caixa, 2);

  -- BOM — Kit Hidráulico: 8 m tubo + 4 conexões
  insert into composicao (tipo_kit_id, insumo_id, quantidade) values
    (v_kit_hidr, v_tubo, 8),
    (v_kit_hidr, v_conexao, 4);

  -- Estoque inicial via movimentações de entrada (o saldo é a soma do livro-razão)
  insert into movimentacao (tipo, insumo_id, local_id, quantidade, observacao) values
    ('entrada_insumo', v_fio,       v_local_eon, 4500, 'Estoque inicial (seed)'),
    ('entrada_insumo', v_disjuntor, v_local_eon,  380, 'Estoque inicial (seed)'),
    ('entrada_insumo', v_caixa,     v_local_eon,  900, 'Estoque inicial (seed)'),
    ('entrada_insumo', v_tubo,      v_local_eon, 2000, 'Estoque inicial (seed)'),
    ('entrada_insumo', v_conexao,   v_local_eon,  600, 'Estoque inicial (seed)');
end $$;
