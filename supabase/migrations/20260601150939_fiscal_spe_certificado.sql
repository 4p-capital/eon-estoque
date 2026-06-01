-- ============================================================================
-- Fiscal: SPE (Sociedade de Propósito Específico) — empresa destinatária das
-- NF-e dos materiais. Guarda o certificado A1 (.pfx) CIFRADO, para consultar o
-- web service NFeDistribuiçãoDFe da SEFAZ com TLS mútuo.
--
-- O .pfx e a senha são cifrados em AES-256-GCM PELA APLICAÇÃO (chave-mestra em
-- env só do servidor) e gravados aqui como base64. Quem ler o banco sem a
-- chave-mestra só vê texto cifrado inútil — defesa contra vazamento do dump.
-- ============================================================================

create table estoque.spe (
  id                    uuid primary key default gen_random_uuid(),
  cnpj                  text not null unique,         -- 14 dígitos (extraído do próprio cert)
  razao_social          text not null,
  empreendimento_id     uuid references estoque.empreendimento(id) on delete set null,
  certificado_cifrado   text not null,                -- base64(iv|tag|ciphertext) do .pfx
  senha_cifrada         text not null,                -- base64(iv|tag|ciphertext) da senha
  certificado_validade  date not null,                -- notAfter do A1 (base do alerta de vencimento)
  ultimo_nsu            bigint not null default 0,    -- cursor do DistribuiçãoDFe (incremental, crítico)
  ativo                 boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table estoque.spe is
  'SPE destinatária das NF-e. Guarda o A1 cifrado (AES-256-GCM, chave-mestra no servidor) p/ consulta ao DistribuiçãoDFe.';
comment on column estoque.spe.ultimo_nsu is
  'Último NSU consultado na SEFAZ. Cursor incremental — não resetar sem motivo (perde/reprocessa notas).';
comment on column estoque.spe.certificado_cifrado is
  'PKCS#12 (.pfx) cifrado em AES-256-GCM pela aplicação. Nunca em claro, nunca no client.';

-- FK usada em join/filtro -> índice (Postgres não indexa FK sozinho).
create index idx_spe_empreendimento on estoque.spe (empreendimento_id);

-- RLS: mesmo padrão do schema (qualquer autenticado; refinar por papel depois).
alter table estoque.spe enable row level security;
create policy "auth_all_spe" on estoque.spe
  for all to authenticated using (true) with check (true);

-- updated_at automático no UPDATE.
create or replace function estoque.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_spe_updated_at
  before update on estoque.spe
  for each row execute function estoque.touch_updated_at();
