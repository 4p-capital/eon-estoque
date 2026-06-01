-- ============================================================================
-- De-para que aprende por fornecedor: além de descrição/EAN, casa pelo par
-- (CNPJ do emitente + código do produto na NF-e). Chave estável por fornecedor.
-- ============================================================================

alter table estoque.de_para_fornecedor
  add column cnpj_emitente  text,
  add column codigo_produto text;

comment on column estoque.de_para_fornecedor.codigo_produto is
  'cProd do item na NF-e (código do produto no fornecedor). Chave do de-para com cnpj_emitente.';

-- Um par (emitente, cProd) mapeia para um único insumo.
create unique index uq_de_para_emitente_produto
  on estoque.de_para_fornecedor (cnpj_emitente, codigo_produto)
  where cnpj_emitente is not null and codigo_produto is not null;
