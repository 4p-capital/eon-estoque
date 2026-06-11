-- ============================================================================
-- Cancelamento de etiquetas pendentes (sobra/erro de impressão) — só gerente.
--
-- Cenário real: geram-se 12 etiquetas, produzem-se 10. As 2 pendentes reservam
-- BOM para sempre (disponível = saldo − reservado) e não havia como soltá-las
-- sem cancelar o lote INTEIRO (e só com o lote aberto). Esta migration cria a
-- operação cirúrgica: cancelar N etiquetas pendentes de um lote — aberto OU
-- finalizado — liberando a reserva na mesma medida.
--
-- Anti-furto: "sobra de impressão" e "kit produzido que sumiu sem bipe" são
-- digitalmente idênticos; só a realidade física distingue. Por isso:
--   * restrito ao papel galpao_admin (o gerente assina e responde);
--   * motivo obrigatório;
--   * nunca apaga: a etiqueta vira status='cancelado' com quem/quando/porquê,
--     e o QR físico bipado depois é rejeitado com mensagem clara;
--   * não toca o livro-razão — nenhum saldo muda, só a reserva é liberada.
--     A divergência física continua aparecendo no inventário (contagem).
-- ============================================================================

-- ── 1. Trilha de cancelamento na unidade ─────────────────────────────────────
alter table estoque.unidade_kit
  add column cancelada_em        timestamptz,
  add column cancelada_por       uuid references auth.users(id) on delete set null,
  add column cancelamento_motivo text;

-- Parcial: ~100% das unidades nunca são canceladas; índice só onde interessa.
create index idx_unidade_kit_cancelada_por on estoque.unidade_kit (cancelada_por)
  where cancelada_por is not null;

comment on column estoque.unidade_kit.cancelada_em is
  'Quando a etiqueta foi cancelada (sobra/erro de impressão ou cancelamento do lote).';
comment on column estoque.unidade_kit.cancelada_por is
  'Quem cancelou — trilha de responsabilização (cancelamento avulso é só gerente).';
comment on column estoque.unidade_kit.cancelamento_motivo is
  'Motivo declarado do cancelamento. Obrigatório no cancelamento avulso.';

-- ── 2. Trigger: transição de/para 'cancelado' só pelo gerente ────────────────
-- O gate na RPC não basta: a policy de escrita de unidade_kit libera qualquer
-- galpao_*, então um operador poderia cancelar (ou DEScancelar) via update
-- direto no PostgREST. O trigger fecha o caminho na camada de dados e carimba
-- a trilha. Papel null = contexto de serviço/manutenção (service_role não tem
-- app_metadata.papel) — passa, pois service_role já ignora RLS por definição.
create or replace function estoque.validar_cancelamento_unidade()
returns trigger language plpgsql set search_path = '' as $$
declare v_papel text := (select estoque.current_papel());
begin
  if (new.status = 'cancelado') = (old.status = 'cancelado') then return new; end if;
  if v_papel is not null and v_papel <> 'galpao_admin' then
    raise exception 'Apenas o gerente do galpão pode cancelar etiquetas (ou reverter um cancelamento).';
  end if;
  if new.status = 'cancelado' then
    new.cancelada_em  := coalesce(new.cancelada_em, now());
    new.cancelada_por := coalesce(new.cancelada_por, auth.uid());
  else
    -- reversão (caso raro de manutenção): limpa a trilha para não mentir.
    new.cancelada_em := null; new.cancelada_por := null; new.cancelamento_motivo := null;
  end if;
  return new;
end; $$;
revoke all on function estoque.validar_cancelamento_unidade()
  from public, anon, authenticated, service_role;

create trigger trg_validar_cancelamento_unidade before update on estoque.unidade_kit
  for each row execute function estoque.validar_cancelamento_unidade();

-- ── 3. cancelar_lote: gate de gerente + trilha nas unidades ──────────────────
-- "Operação de cancelamento é do gerente" vale também para o lote inteiro —
-- cancelar lote libera a reserva do mesmo jeito que o cancelamento avulso.
create or replace function estoque.cancelar_lote(p_lote_id uuid)
returns estoque.lote language plpgsql set search_path = '' as $$
declare v_lote estoque.lote; v_papel text := (select estoque.current_papel());
begin
  if v_papel is not null and v_papel <> 'galpao_admin' then
    raise exception 'Apenas o gerente do galpão pode cancelar um lote.'; end if;
  select * into v_lote from estoque.lote where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  if v_lote.status <> 'aberto' then
    raise exception 'Apenas lotes abertos podem ser cancelados (status atual: %).', v_lote.status; end if;
  update estoque.unidade_kit
     set status = 'cancelado', cancelada_em = now(), cancelada_por = auth.uid(),
         cancelamento_motivo = 'Cancelamento do lote'
   where lote_id = p_lote_id and status = 'pendente';
  update estoque.lote set status = 'cancelado', finalizado_em = now(), finalizado_por = auth.uid()
   where id = p_lote_id returning * into v_lote;
  return v_lote;
end; $$;
comment on function estoque.cancelar_lote(uuid) is
  'Cancela lote aberto e suas unidades pendentes (com trilha; só gerente). Não afeta unidades já bipadas.';

-- ── 4. cancelar_etiquetas_pendentes (avulso, gerente, lote aberto/finalizado) ─
create or replace function estoque.cancelar_etiquetas_pendentes(
  p_lote_id    uuid,
  p_quantidade integer,
  p_motivo     text
) returns integer language plpgsql set search_path = '' as $$
declare
  v_lote       estoque.lote;
  v_canceladas integer;
  v_papel      text := (select estoque.current_papel());
begin
  -- Gating no banco (não só na UI); papel null = contexto de serviço.
  if v_papel is not null and v_papel <> 'galpao_admin' then
    raise exception 'Apenas o gerente do galpão pode cancelar etiquetas.'; end if;
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade de etiquetas a cancelar deve ser maior que zero.'; end if;
  if nullif(trim(p_motivo), '') is null then
    raise exception 'Informe o motivo do cancelamento.'; end if;

  -- Lock do lote: serializa com gerar_etiquetas/cancelar_lote do mesmo lote.
  select * into v_lote from estoque.lote where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  if v_lote.status not in ('aberto', 'finalizado') then
    raise exception 'Lote % não permite cancelar etiquetas.', v_lote.status; end if;

  -- Cancela as N pendentes mais recentes (maior número): a sobra de impressão
  -- é tipicamente o fim da tira. FOR UPDATE serializa com o bipe; se um bipe
  -- concorrente converter uma delas, o row_count cai e a transação aborta
  -- inteira (sem cancelamento parcial silencioso).
  update estoque.unidade_kit uk
     set status = 'cancelado', cancelada_em = now(), cancelada_por = auth.uid(),
         cancelamento_motivo = trim(p_motivo)
   where uk.id in (
     select id from estoque.unidade_kit
      where lote_id = p_lote_id and status = 'pendente'
      order by numero desc
      limit p_quantidade
      for update
   )
   and uk.status = 'pendente';
  get diagnostics v_canceladas = row_count;

  if v_canceladas < p_quantidade then
    raise exception
      'O lote tem só % etiqueta(s) pendente(s) — pedido: %. Atualize a página e tente de novo.',
      v_canceladas, p_quantidade; end if;

  return v_canceladas;
end; $$;

comment on function estoque.cancelar_etiquetas_pendentes(uuid, integer, text) is
  'Cancela N etiquetas pendentes de um lote (aberto/finalizado), liberando a reserva de BOM. Só galpao_admin, motivo obrigatório, trilha em cancelada_em/por/motivo. Atômica.';

-- ── 5. Grants ─────────────────────────────────────────────────────────────────
grant execute on function estoque.cancelar_etiquetas_pendentes(uuid, integer, text)
  to authenticated, service_role;
