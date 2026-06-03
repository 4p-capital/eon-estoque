-- ============================================================================
-- Consulta PÚBLICA de kit por QR (página externa /k/<token> que o QR aponta).
-- Função SECURITY DEFINER que retorna SÓ campos liberados (whitelist) — sem
-- movimentação, sem ids internos sensíveis. Permite leitura por `anon` (a página
-- é pública), sem abrir as tabelas (RLS continua só-autenticado).
-- ============================================================================

create or replace function estoque.consultar_kit_publico(p_qr_code text)
returns table (
  numero               bigint,
  tipo_kit_nome        text,
  empreendimento_nome  text,
  status               text,
  fabricado_em         timestamptz,
  data_producao        date,
  lote_id              uuid
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    uk.numero,
    tk.nome,
    e.nome,
    uk.status,
    coalesce(uk.impressa_em, uk.created_at) as fabricado_em,
    l.data_producao,
    l.id
  from estoque.unidade_kit uk
  join estoque.lote l        on l.id = uk.lote_id
  join estoque.tipo_kit tk   on tk.id = l.tipo_kit_id
  left join estoque.empreendimento e on e.id = l.empreendimento_id
  where uk.qr_code = p_qr_code;
$$;

comment on function estoque.consultar_kit_publico(text) is
  'Consulta pública (anon) de um kit por QR: retorna só campos básicos (sem movimentação).';

-- anon precisa de USAGE no schema + EXECUTE na função (as tabelas seguem fechadas).
grant usage on schema estoque to anon;
revoke all on function estoque.consultar_kit_publico(text) from public;
grant execute on function estoque.consultar_kit_publico(text) to anon, authenticated, service_role;
