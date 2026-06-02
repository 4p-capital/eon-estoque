-- O índice único parcial (where ... is not null) NÃO satisfaz o ON CONFLICT
-- (cnpj_emitente, codigo_produto) do upsert do de-para (erro 42P10). Troca por
-- índice não-parcial. NULLs continuam permitidos (são distintos no Postgres),
-- então de-paras manuais sem CNPJ/código seguem possíveis; a unicidade vale
-- para pares (CNPJ, código) preenchidos.
drop index if exists estoque.uq_de_para_emitente_produto;

create unique index uq_de_para_emitente_produto
  on estoque.de_para_fornecedor (cnpj_emitente, codigo_produto);
