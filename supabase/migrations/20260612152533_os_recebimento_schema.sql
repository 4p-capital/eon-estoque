-- ============================================================================
-- OS de expedição — schema do recebimento na obra (1/2).
--
-- A saída vira uma OS rastreável de ponta a ponta: o galpão bipa na expedição
-- (em_estoque -> expedido, já existia) e a OBRA bipa no recebimento (expedido
-- -> entregue) numa página PÚBLICA — o link/QR da OS viaja impresso com o
-- caminhão e o token único é a credencial (capability URL, padrão /k/<token>).
-- 30 saíram x 29 recebidos = divergência registrada e visível ao galpão.
--
-- Esta migration cria o estado; as RPCs públicas vêm na 2/2:
--   * identidade da OS: numero legível + recebimento_token (uuid unique);
--   * janela de recebimento de 48h aberta por finalizar_saida;
--   * recebedor (nome + CPF validado por dígito verificador) e desfecho
--     (recebida | recebida_divergencia | recusada);
--   * unidade_kit.entregue_em (o bipe da obra);
--   * saida_bipe_estranho: QR bipado na obra que NÃO pertence à OS — vira
--     divergência auditável, nunca passa batido.
-- ============================================================================

-- ── 1. Identidade de OS + recebimento na tabela saida ────────────────────────
create sequence estoque.seq_numero_saida start 1;

alter table estoque.saida
  add column numero                bigint,
  add column recebimento_token     uuid not null default gen_random_uuid(),
  add column recebimento_expira_em timestamptz,
  add column recebido_em           timestamptz,
  add column recebedor_nome        text,
  add column recebedor_cpf         text,
  add column recusa_motivo         text;

comment on column estoque.saida.numero is
  'Número legível e sequencial da OS de expedição ("OS #12").';
comment on column estoque.saida.recebimento_token is
  'Token público do recebimento (capability URL /os/<token>). Quem tem o link recebe ESTA OS.';
comment on column estoque.saida.recebimento_expira_em is
  'Fim da janela de recebimento (48h após finalizar; prorrogável pelo gerente).';
comment on column estoque.saida.recebedor_cpf is
  'CPF do recebedor na obra (só dígitos, validado por DV). NUNCA exposto em RPC pública — só mascarado.';

-- Backfill do numero em ordem cronológica + sequence assume dali em diante.
with ordenadas as (
  select id, row_number() over (order by created_at, id) as rn from estoque.saida
)
update estoque.saida s set numero = o.rn from ordenadas o where o.id = s.id;
select setval('estoque.seq_numero_saida',
  coalesce((select max(numero) from estoque.saida), 0) + 1, false);

alter table estoque.saida
  alter column numero set default nextval('estoque.seq_numero_saida'),
  alter column numero set not null;
alter sequence estoque.seq_numero_saida owned by estoque.saida.numero;
create unique index uq_saida_numero on estoque.saida (numero);
create unique index uq_saida_recebimento_token on estoque.saida (recebimento_token);

-- ── 2. Ciclo de vida da OS: desfechos do recebimento ─────────────────────────
alter table estoque.saida drop constraint saida_status_check;
alter table estoque.saida add constraint saida_status_check
  check (status in ('aberta','finalizada','recebida','recebida_divergencia','recusada','cancelada'));

comment on table estoque.saida is
  'OS de expedição (1 empreendimento). aberta (galpão bipando) -> finalizada (em recebimento na obra) -> recebida | recebida_divergencia | recusada. cancelada = rascunho descartado.';

-- ── 3. CPF: validação por dígito verificador no banco ────────────────────────
create or replace function estoque.cpf_valido(p_cpf text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  soma integer; dv integer; i integer;
begin
  if length(v) <> 11 then return false; end if;
  if v ~ '^(\d)\1{10}$' then return false; end if;  -- 111.111.111-11 etc.
  soma := 0;
  for i in 1..9 loop soma := soma + substr(v, i, 1)::integer * (11 - i); end loop;
  dv := (soma * 10) % 11; if dv = 10 then dv := 0; end if;
  if dv <> substr(v, 10, 1)::integer then return false; end if;
  soma := 0;
  for i in 1..10 loop soma := soma + substr(v, i, 1)::integer * (12 - i); end loop;
  dv := (soma * 10) % 11; if dv = 10 then dv := 0; end if;
  return dv = substr(v, 11, 1)::integer;
end; $$;
comment on function estoque.cpf_valido(text) is
  'Valida CPF por dígitos verificadores (aceita com ou sem máscara; rejeita repetidos).';
revoke all on function estoque.cpf_valido(text) from public;
grant execute on function estoque.cpf_valido(text) to authenticated, service_role;

-- Defesa em profundidade: CPF inválido não entra nem por update direto.
alter table estoque.saida add constraint saida_recebedor_cpf_check
  check (recebedor_cpf is null or estoque.cpf_valido(recebedor_cpf));

-- ── 4. unidade_kit: carimbo do bipe de recebimento ───────────────────────────
alter table estoque.unidade_kit add column entregue_em timestamptz;
comment on column estoque.unidade_kit.entregue_em is
  'Quando o kit foi bipado no RECEBIMENTO da obra (expedido -> entregue, via página pública da OS).';

-- ── 5. saida_bipe_estranho: QR bipado na obra que não pertence à OS ──────────
-- Tabela própria (não jsonb na saida): vários celulares bipando concorrem sem
-- disputa de uma linha única, unique evita duplicar o mesmo QR e a contagem
-- entra indexada na view. Escrita pública SÓ via RPC definer (zero grant a anon).
create table estoque.saida_bipe_estranho (
  id             uuid primary key default gen_random_uuid(),
  saida_id       uuid not null references estoque.saida(id) on delete cascade,
  qr_code        text not null,
  unidade_kit_id uuid references estoque.unidade_kit(id) on delete set null,
  motivo         text not null,
  bipado_em      timestamptz not null default now(),
  tenant_id      uuid not null references estoque.tenant(id) on delete restrict,
  constraint uq_bipe_estranho_por_saida unique (saida_id, qr_code)
);

comment on table estoque.saida_bipe_estranho is
  'Bipes de recebimento que NÃO pertencem à OS (QR desconhecido/de outra remessa/não expedido). Cada linha é divergência auditável.';
comment on column estoque.saida_bipe_estranho.unidade_kit_id is
  'Preenchido quando o QR é de um kit conhecido (só está na OS errada).';

create index idx_bipe_estranho_unidade on estoque.saida_bipe_estranho (unidade_kit_id);
create index idx_bipe_estranho_tenant  on estoque.saida_bipe_estranho (tenant_id);

create or replace function estoque.derivar_tenant_bipe_estranho()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tenant_id is not null then return new; end if;
  select tenant_id into new.tenant_id from estoque.saida where id = new.saida_id;
  if new.tenant_id is null then
    raise exception 'saida_bipe_estranho: não foi possível derivar tenant_id da saída %.', new.saida_id;
  end if;
  return new;
end; $$;
revoke all on function estoque.derivar_tenant_bipe_estranho()
  from public, anon, authenticated, service_role;

create trigger trg_tenant_bipe_estranho before insert on estoque.saida_bipe_estranho
  for each row execute function estoque.derivar_tenant_bipe_estranho();

alter table estoque.saida_bipe_estranho enable row level security;
create policy "bipe_estranho_select" on estoque.saida_bipe_estranho
  for select to authenticated
  using ((select estoque.is_galpao()) or tenant_id = (select estoque.current_tenant_id()));
create policy "bipe_estranho_modify" on estoque.saida_bipe_estranho
  for all to authenticated
  using ((select estoque.is_galpao()))
  with check ((select estoque.is_galpao()));
grant select, insert, update, delete on estoque.saida_bipe_estranho to authenticated, service_role;

-- ── 6. saida_resumo_view: campos do recebimento (apêndice, mesma ordem base) ──
create or replace view estoque.saida_resumo_view with (security_invoker = true) as
select
  s.id as saida_id,
  s.empreendimento_id,
  e.nome as empreendimento_nome,
  s.destino,
  s.status,
  s.observacao,
  s.created_at,
  s.finalizado_em,
  count(uk.id) as qtd_kits,
  s.tenant_id,
  -- recebimento (apêndice):
  s.numero,
  s.recebimento_token,
  s.recebimento_expira_em,
  s.recebido_em,
  s.recebedor_nome,
  case when s.recebedor_cpf is null then null
       else '***.' || substr(s.recebedor_cpf, 4, 3) || '.' || substr(s.recebedor_cpf, 7, 3) || '-**'
  end as recebedor_cpf_mascarado,
  s.recusa_motivo,
  count(uk.id) filter (where uk.status = 'entregue') as qtd_entregues,
  (select count(*) from estoque.saida_bipe_estranho b where b.saida_id = s.id) as qtd_estranhos
from estoque.saida s
join estoque.empreendimento e on e.id = s.empreendimento_id
left join estoque.unidade_kit uk on uk.saida_id = s.id
group by s.id, e.nome;

-- ── 7. evento: tipos do recebimento de expedição ─────────────────────────────
alter table estoque.evento drop constraint evento_tipo_check;
alter table estoque.evento add constraint evento_tipo_check check (tipo in (
  'recebimento','recebimento_divergencia','recusa_nota','mapeamento_insumo',
  'recebimento_expedicao','recebimento_expedicao_divergencia','recusa_expedicao'
));

-- ── 8. finalizar_saida abre a janela de recebimento (48h) ────────────────────
create or replace function estoque.finalizar_saida(p_saida_id uuid)
returns estoque.saida language plpgsql set search_path = '' as $$
declare v_saida estoque.saida; v_qtd integer;
begin
  select * into v_saida from estoque.saida where id = p_saida_id for update;
  if not found then raise exception 'Saída não encontrada.'; end if;
  if v_saida.status <> 'aberta' then
    raise exception 'Saída já está % e não pode ser finalizada.', v_saida.status;
  end if;
  select count(*) into v_qtd from estoque.unidade_kit where saida_id = p_saida_id;
  if v_qtd = 0 then
    raise exception 'Esta saída não tem nenhum kit bipado — cancele o rascunho em vez de finalizar.';
  end if;
  update estoque.saida
     set status = 'finalizada', finalizado_em = now(), finalizado_por = auth.uid(),
         -- JANELA_RECEBIMENTO: a obra tem 48h para bipar/confirmar; gerente prorroga.
         recebimento_expira_em = now() + interval '48 hours'
   where id = p_saida_id returning * into v_saida;
  return v_saida;
end; $$;
comment on function estoque.finalizar_saida(uuid) is
  'Finaliza a OS (aberta -> finalizada, exige >= 1 kit) e abre a janela pública de recebimento (48h).';

-- ── 9. Trigger: ciclo de vida do recebimento protegido na camada de dados ────
-- O gate nas RPCs não basta (mesma lição do trg_validar_cancelamento_unidade):
-- a policy de escrita da saida libera qualquer galpao_*, então um operador
-- poderia, via PATCH direto no PostgREST, forjar/editar o desfecho assinado
-- pela obra ou esticar a janela. Regras:
--   * transição para desfecho (recebida/recebida_divergencia/recusada) só pelo
--     fluxo público (papel null = RPC definer/service) e só a partir de
--     'finalizada';
--   * desfecho é IMUTÁVEL: em status terminal nada mais muda (exceto serviço);
--   * dados do recebedor só são gravados nessa transição;
--   * janela (recebimento_expira_em) muda só no finalizar (aberta->finalizada)
--     ou por galpao_admin (prorrogar).
create or replace function estoque.validar_recebimento_saida()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_papel    text := (select estoque.current_papel());
  v_terminal constant text[] := array['recebida','recebida_divergencia','recusada'];
  v_recebedor_mudou boolean :=
    new.recebedor_nome is distinct from old.recebedor_nome
    or new.recebedor_cpf is distinct from old.recebedor_cpf
    or new.recebido_em   is distinct from old.recebido_em
    or new.recusa_motivo is distinct from old.recusa_motivo;
begin
  -- Caminhos confiáveis passam direto: contexto de serviço (papel null) e a
  -- RPC confirmar_recebimento (flag transacional — um usuário do galpão LOGADO
  -- pode abrir a página pública e confirmar; o papel dele não muda isso).
  if v_papel is null
     or current_setting('estoque.recebimento_publico', true) = 'on' then
    return new;
  end if;

  if old.status = any(v_terminal)
     and (new.status is distinct from old.status or v_recebedor_mudou
          or new.recebimento_expira_em is distinct from old.recebimento_expira_em) then
    raise exception 'OS já confirmada na obra — o desfecho do recebimento é imutável.';
  end if;
  if new.status = any(v_terminal) and new.status is distinct from old.status then
    raise exception 'O desfecho do recebimento é registrado pela obra, na página pública da OS.';
  end if;
  if v_recebedor_mudou then
    raise exception 'Os dados do recebedor são gravados pela obra na confirmação do recebimento.';
  end if;
  if new.recebimento_expira_em is distinct from old.recebimento_expira_em
     and not (old.status = 'aberta' and new.status = 'finalizada')
     and v_papel <> 'galpao_admin' then
    raise exception 'Apenas o gerente do galpão pode alterar a janela de recebimento.';
  end if;
  return new;
end; $$;
revoke all on function estoque.validar_recebimento_saida()
  from public, anon, authenticated, service_role;

create trigger trg_validar_recebimento_saida before update on estoque.saida
  for each row execute function estoque.validar_recebimento_saida();
