-- UF da SPE (código IBGE, 2 dígitos) — necessária como `cUFAutor` na consulta
-- ao NFeDistribuiçãoDFe da SEFAZ. Nullable porque a tabela pode já ter linhas;
-- o cadastro passa a exigir no app.
alter table estoque.spe add column uf text;

comment on column estoque.spe.uf is
  'Código IBGE da UF da SPE (ex.: 52 = GO). Usado como cUFAutor no DistribuiçãoDFe.';
