-- ============================================================================
-- Privilégios dos roles da API (PostgREST) no schema estoque.
--
-- Um schema NOVO não herda os grants automáticos que o `public` recebe no
-- Supabase. A RLS continua sendo a porta de acesso às LINHAS; aqui liberamos o
-- privilégio de TABELA/SCHEMA, senão a API responde "permission denied for
-- schema estoque" mesmo com policy.
--
-- Dados (select/insert/update/delete) só para `authenticated` + `service_role`
-- (anti-furto: `anon` não lê estoque). `usage` no schema também para `anon`
-- para o PostgREST conseguir resolvê-lo.
-- ============================================================================

grant usage on schema estoque to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema estoque
  to authenticated, service_role;
grant usage, select on all sequences in schema estoque
  to authenticated, service_role;
grant execute on all functions in schema estoque
  to authenticated, service_role;

-- Objetos futuros nesse schema herdam os mesmos privilégios.
alter default privileges in schema estoque
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema estoque
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema estoque
  grant execute on functions to authenticated, service_role;
