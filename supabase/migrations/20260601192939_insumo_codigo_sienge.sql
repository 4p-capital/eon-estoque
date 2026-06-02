-- Código do insumo no catálogo do Sienge (origem). Único — base de dedupe na
-- reimportação (upsert por codigo_sienge). NULLs são permitidos (insumos
-- criados manualmente, sem origem Sienge); no Postgres NULLs são distintos.
alter table estoque.insumo add column codigo_sienge text;

create unique index uq_insumo_codigo_sienge on estoque.insumo (codigo_sienge);

comment on column estoque.insumo.codigo_sienge is
  'Código do insumo no Sienge. Único; chave de dedupe na importação do catálogo.';
