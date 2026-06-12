-- ============================================================================
-- OS de expedição — RPCs do recebimento público na obra (2/2).
--
-- "Aberto mas seguro": a página /os/<token> não tem login. O role anon NÃO
-- enxerga nenhuma tabela — estas funções SECURITY DEFINER são a única porta,
-- e o token único da OS é a credencial (mesmo modelo de consultar_kit_publico).
--
-- Contrato das públicas: retornam jsonb discriminado ({resultado, mensagem,…})
-- e NUNCA usam raise em fluxo de negócio — exception faria rollback e o
-- registro do bipe estranho precisa commitar. Toda validação acontece AQUI
-- (token, janela, status); o client é só conveniência.
-- ============================================================================

-- ── 1. consultar_recebimento_publico: tudo que a página da OS mostra ─────────
-- Whitelist estrita: sem uuids internos, sem CPF cru, sem qr_code dos kits da
-- OS (só dos bipes estranhos, que o próprio recebedor gerou).
create or replace function estoque.consultar_recebimento_publico(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_token uuid;
  v_saida estoque.saida;
  v_emp   text;
  v_kits  jsonb;
  v_estr  jsonb;
begin
  begin
    v_token := trim(p_token)::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('resultado', 'nao_encontrada');
  end;

  select * into v_saida from estoque.saida where recebimento_token = v_token;
  if not found then return jsonb_build_object('resultado', 'nao_encontrada'); end if;

  select e.nome into v_emp from estoque.empreendimento e where e.id = v_saida.empreendimento_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'numero', uk.numero,
           'tipo_kit_nome', tk.nome,
           'status', uk.status,
           'entregue_em', uk.entregue_em
         ) order by uk.numero), '[]'::jsonb)
    into v_kits
    from estoque.unidade_kit uk
    join estoque.lote l      on l.id = uk.lote_id
    join estoque.tipo_kit tk on tk.id = l.tipo_kit_id
   where uk.saida_id = v_saida.id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'qr_code', b.qr_code,
           'motivo', b.motivo,
           'bipado_em', b.bipado_em
         ) order by b.bipado_em), '[]'::jsonb)
    into v_estr
    from estoque.saida_bipe_estranho b
   where b.saida_id = v_saida.id;

  return jsonb_build_object(
    'resultado', 'ok',
    'os', jsonb_build_object(
      'numero', v_saida.numero,
      'status', v_saida.status,
      'destino', v_saida.destino,
      'empreendimento_nome', v_emp,
      'finalizado_em', v_saida.finalizado_em,
      'recebimento_expira_em', v_saida.recebimento_expira_em,
      'janela_ativa', (v_saida.status = 'finalizada'
                       and v_saida.recebimento_expira_em is not null
                       and now() < v_saida.recebimento_expira_em),
      'recebido_em', v_saida.recebido_em,
      'recebedor_nome', v_saida.recebedor_nome,
      'recebedor_cpf_mascarado',
        case when v_saida.recebedor_cpf is null then null
             else '***.' || substr(v_saida.recebedor_cpf, 4, 3) || '.'
                  || substr(v_saida.recebedor_cpf, 7, 3) || '-**' end,
      'recusa_motivo', v_saida.recusa_motivo
    ),
    'kits', v_kits,
    'estranhos', v_estr
  );
end; $$;

comment on function estoque.consultar_recebimento_publico(text) is
  'Página pública da OS (/os/<token>): cabeçalho + kits + bipes estranhos. Whitelist — sem ids internos nem CPF cru.';

-- ── 2. bipar_recebimento: o bipe da obra (expedido -> entregue) ──────────────
create or replace function estoque.bipar_recebimento(p_token text, p_qr_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token     uuid;
  v_saida     estoque.saida;
  v_unidade   estoque.unidade_kit;
  v_tipo      text;
  v_qr        text := trim(coalesce(p_qr_code, ''));
  v_motivo    text;
  v_entregues integer;
  v_total     integer;
  v_estranhos integer;
begin
  begin
    v_token := trim(p_token)::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('resultado', 'nao_encontrada');
  end;
  -- Endpoint público de escrita: limita formato antes de qualquer lock.
  -- QR legítimo é uuid::text (36 chars); 64 dá folga sem aceitar lixo gigante.
  if v_qr = '' then
    return jsonb_build_object('resultado', 'erro', 'mensagem', 'Bipe ou digite um código.');
  end if;
  if length(v_qr) > 64 then
    return jsonb_build_object('resultado', 'erro',
      'mensagem', 'Código inválido — bipe o QR da etiqueta do kit.');
  end if;

  -- Lock da OS: serializa bipes de vários celulares e a confirmação.
  select * into v_saida from estoque.saida where recebimento_token = v_token for update;
  if not found then return jsonb_build_object('resultado', 'nao_encontrada'); end if;
  if v_saida.status <> 'finalizada'
     or v_saida.recebimento_expira_em is null
     or now() >= v_saida.recebimento_expira_em then
    return jsonb_build_object('resultado', 'encerrada',
      'mensagem', 'O recebimento desta OS não está mais aberto. Procure o galpão EON.');
  end if;

  select uk.* into v_unidade from estoque.unidade_kit uk where uk.qr_code = v_qr for update;

  -- QR que não pertence a esta OS = bipe estranho (vira divergência registrada).
  if not found or v_unidade.saida_id is distinct from v_saida.id
     or (v_unidade.saida_id = v_saida.id and v_unidade.status not in ('expedido', 'entregue')) then
    -- Teto anti-flood: o link viaja impresso; quem o tiver não enche a tabela.
    select count(*) into v_estranhos
      from estoque.saida_bipe_estranho where saida_id = v_saida.id;
    if v_estranhos >= 200 then
      return jsonb_build_object('resultado', 'erro',
        'mensagem', 'Muitos códigos não reconhecidos nesta OS — procure o galpão EON.');
    end if;
    v_motivo := case
      when v_unidade.id is null then 'QR desconhecido'
      when v_unidade.saida_id is null
        then 'Kit #' || v_unidade.numero || ' não está em nenhuma remessa'
      when v_unidade.saida_id is distinct from v_saida.id
        then 'Kit #' || v_unidade.numero || ' pertence a outra remessa'
      else 'Kit #' || v_unidade.numero || ' não está expedido nesta remessa (status: '
           || v_unidade.status || ')'
    end;
    insert into estoque.saida_bipe_estranho (saida_id, qr_code, unidade_kit_id, motivo)
    values (v_saida.id, v_qr, v_unidade.id, v_motivo)
    on conflict (saida_id, qr_code) do nothing;
    return jsonb_build_object('resultado', 'estranho', 'motivo', v_motivo,
      'mensagem', 'Este código não pertence a esta OS — registrado como divergência.');
  end if;

  if v_unidade.status = 'entregue' then
    return jsonb_build_object('resultado', 'duplicado', 'numero', v_unidade.numero,
      'mensagem', 'Kit #' || v_unidade.numero || ' já foi recebido.');
  end if;

  update estoque.unidade_kit
     set status = 'entregue', entregue_em = now()
   where id = v_unidade.id
  returning * into v_unidade;

  select tk.nome into v_tipo
    from estoque.lote l join estoque.tipo_kit tk on tk.id = l.tipo_kit_id
   where l.id = v_unidade.lote_id;
  select count(*), count(*) filter (where status = 'entregue')
    into v_total, v_entregues
    from estoque.unidade_kit where saida_id = v_saida.id;

  return jsonb_build_object('resultado', 'entregue', 'numero', v_unidade.numero,
    'tipo_kit_nome', coalesce(v_tipo, 'Kit'), 'entregues', v_entregues, 'total', v_total);
end; $$;

comment on function estoque.bipar_recebimento(text, text) is
  'Bipe público de recebimento na obra: expedido -> entregue dentro da OS do token. QR alheio vira bipe estranho (divergência). Sem movimentação — saldo do galpão intocado.';

-- ── 3. confirmar_recebimento: o desfecho da OS (3 ações) ─────────────────────
-- receber: exige 100% (zero faltantes E zero estranhos).
-- receber_divergencia: exige divergência existente.
-- recusar: motivo obrigatório; kits entregues voltam a expedido (carga retorna).
create or replace function estoque.confirmar_recebimento(
  p_token  text,
  p_acao   text,
  p_nome   text,
  p_cpf    text,
  p_motivo text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token     uuid;
  v_saida     estoque.saida;
  v_nome      text := trim(coalesce(p_nome, ''));
  v_cpf       text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_motivo    text := nullif(trim(coalesce(p_motivo, '')), '');
  v_total     integer;
  v_entregues integer;
  v_faltantes integer;
  v_estranhos integer;
  v_faltam    jsonb;
  v_status    text;
  v_cpf_masc  text;
begin
  begin
    v_token := trim(p_token)::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('resultado', 'nao_encontrada');
  end;
  if p_acao not in ('receber', 'receber_divergencia', 'recusar') then
    return jsonb_build_object('resultado', 'erro', 'mensagem', 'Ação inválida.');
  end if;
  -- Endpoint público: limites de tamanho (a UI já corta; o banco garante).
  if length(v_nome) < 5 or length(v_nome) > 120 then
    return jsonb_build_object('resultado', 'erro',
      'mensagem', 'Informe o nome completo de quem está recebendo (até 120 caracteres).');
  end if;
  if length(coalesce(v_motivo, '')) > 500 then
    return jsonb_build_object('resultado', 'erro', 'mensagem', 'Motivo muito longo (máx. 500).');
  end if;
  if not estoque.cpf_valido(v_cpf) then
    return jsonb_build_object('resultado', 'erro', 'mensagem', 'CPF inválido — confira os dígitos.');
  end if;
  if p_acao = 'recusar' and v_motivo is null then
    return jsonb_build_object('resultado', 'erro', 'mensagem', 'Informe o motivo da recusa.');
  end if;

  select * into v_saida from estoque.saida where recebimento_token = v_token for update;
  if not found then return jsonb_build_object('resultado', 'nao_encontrada'); end if;
  if v_saida.status <> 'finalizada'
     or v_saida.recebimento_expira_em is null
     or now() >= v_saida.recebimento_expira_em then
    return jsonb_build_object('resultado', 'encerrada',
      'mensagem', 'O recebimento desta OS não está mais aberto. Procure o galpão EON.');
  end if;

  -- Contadores sob o lock da OS (bipes concorrentes esperam o lock acima).
  select count(*), count(*) filter (where status = 'entregue')
    into v_total, v_entregues
    from estoque.unidade_kit where saida_id = v_saida.id;
  v_faltantes := v_total - v_entregues;
  select count(*) into v_estranhos from estoque.saida_bipe_estranho where saida_id = v_saida.id;
  select coalesce(jsonb_agg(numero order by numero), '[]'::jsonb) into v_faltam
    from estoque.unidade_kit where saida_id = v_saida.id and status <> 'entregue';

  -- Libera o trigger de ciclo de vida da saida para ESTA transação: este é o
  -- caminho confiável do desfecho, independente do papel de quem abriu o link.
  perform set_config('estoque.recebimento_publico', 'on', true);

  if p_acao = 'receber' then
    if v_faltantes > 0 or v_estranhos > 0 then
      return jsonb_build_object('resultado', 'erro', 'mensagem',
        'Há divergência (' || v_faltantes || ' kit(s) sem bipe, ' || v_estranhos ||
        ' bipe(s) estranho(s)) — use "Receber com divergência" ou "Não receber".');
    end if;
    v_status := 'recebida';
  elsif p_acao = 'receber_divergencia' then
    if v_faltantes = 0 and v_estranhos = 0 then
      return jsonb_build_object('resultado', 'erro',
        'mensagem', 'Não há divergência — todos os kits foram bipados. Use "Receber".');
    end if;
    v_status := 'recebida_divergencia';
  else
    v_status := 'recusada';
    -- A carga volta no caminhão: desfaz os bipes de recebimento desta OS.
    update estoque.unidade_kit
       set status = 'expedido', entregue_em = null
     where saida_id = v_saida.id and status = 'entregue';
  end if;

  update estoque.saida
     set status = v_status, recebido_em = now(),
         recebedor_nome = v_nome, recebedor_cpf = v_cpf, recusa_motivo = v_motivo
   where id = v_saida.id;

  v_cpf_masc := '***.' || substr(v_cpf, 4, 3) || '.' || substr(v_cpf, 7, 3) || '-**';
  insert into estoque.evento (tipo, empreendimento_id, usuario_id, descricao, dados)
  values (
    case v_status when 'recebida' then 'recebimento_expedicao'
                  when 'recebida_divergencia' then 'recebimento_expedicao_divergencia'
                  else 'recusa_expedicao' end,
    v_saida.empreendimento_id,
    auth.uid(),  -- null no fluxo público (anon)
    case v_status
      when 'recebida' then 'OS #' || v_saida.numero || ' recebida na obra (completa)'
      when 'recebida_divergencia' then 'OS #' || v_saida.numero || ' recebida COM DIVERGÊNCIA'
      else 'OS #' || v_saida.numero || ' recusada na obra' end,
    jsonb_build_object(
      'saida_id', v_saida.id, 'os_numero', v_saida.numero, 'acao', p_acao,
      'total', v_total, 'entregues', v_entregues,
      'faltantes_numeros', v_faltam, 'estranhos', v_estranhos,
      'recebedor_nome', v_nome, 'recebedor_cpf', v_cpf_masc, 'motivo', v_motivo)
  );

  return jsonb_build_object('resultado', 'confirmada', 'status', v_status);
end; $$;

comment on function estoque.confirmar_recebimento(text, text, text, text, text) is
  'Fecha o recebimento público da OS: receber (exige 100%), receber_divergencia (exige divergência) ou recusar (motivo; desfaz bipes). Grava recebedor (nome + CPF validado) e evento de auditoria.';

-- ── 4. prorrogar_recebimento: gerente reabre/estende a janela (+48h) ─────────
-- Invoker (RLS da saida já restringe escrita ao galpão) + gate de papel.
-- Mesmo token — o QR impresso que viajou com o caminhão continua valendo.
create or replace function estoque.prorrogar_recebimento(p_saida_id uuid)
returns estoque.saida language plpgsql set search_path = '' as $$
declare
  v_saida estoque.saida;
  v_papel text := (select estoque.current_papel());
begin
  if v_papel is not null and v_papel <> 'galpao_admin' then
    raise exception 'Apenas o gerente do galpão pode prorrogar o recebimento.'; end if;
  select * into v_saida from estoque.saida where id = p_saida_id for update;
  if not found then raise exception 'Saída não encontrada.'; end if;
  if v_saida.status <> 'finalizada' then
    raise exception 'Só uma OS finalizada (aguardando recebimento) pode ser prorrogada — status atual: %.',
      v_saida.status; end if;
  update estoque.saida set recebimento_expira_em = now() + interval '48 hours'
   where id = p_saida_id returning * into v_saida;
  return v_saida;
end; $$;
comment on function estoque.prorrogar_recebimento(uuid) is
  'Estende a janela pública de recebimento da OS por +48h a partir de agora (só galpao_admin; mesmo token).';

-- ── 5. Grants — anon só nas portas públicas ───────────────────────────────────
revoke all on function estoque.consultar_recebimento_publico(text) from public;
revoke all on function estoque.bipar_recebimento(text, text) from public;
revoke all on function estoque.confirmar_recebimento(text, text, text, text, text) from public;
revoke all on function estoque.prorrogar_recebimento(uuid) from public, anon;

grant execute on function estoque.consultar_recebimento_publico(text)
  to anon, authenticated, service_role;
grant execute on function estoque.bipar_recebimento(text, text)
  to anon, authenticated, service_role;
grant execute on function estoque.confirmar_recebimento(text, text, text, text, text)
  to anon, authenticated, service_role;
grant execute on function estoque.prorrogar_recebimento(uuid)
  to authenticated, service_role;
