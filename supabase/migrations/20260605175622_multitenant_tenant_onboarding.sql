-- ============================================================================
-- Multi-tenant — onboarding do cliente.
-- O galpão convida um cliente criando um tenant "rascunho" (nome de referência);
-- o cliente, no primeiro acesso (link de convite -> /onboarding), completa o
-- nome de exibição da empresa e marca o onboarding como concluído.
--   onboarding_completo = false -> aparece como "pendente" pro galpão.
-- Tenants já existentes (ex.: EON) nascem concluídos.
-- ============================================================================

alter table estoque.tenant
  add column onboarding_completo boolean not null default false;

comment on column estoque.tenant.onboarding_completo is
  'False = tenant rascunho aguardando o cliente completar o cadastro no /onboarding.';

-- Tenants pré-existentes já estão operacionais.
update estoque.tenant set onboarding_completo = true;
