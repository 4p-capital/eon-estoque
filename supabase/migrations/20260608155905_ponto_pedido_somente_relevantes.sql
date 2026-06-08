-- ============================================================================
-- ponto_de_pedido_view: só insumos RELEVANTES.
-- saldo_insumo é o catálogo inteiro (~6k insumos, a maioria com saldo 0 e mínimo
-- 0). Isso furava o dashboard: estourava o limite de 1000 linhas da query e
-- marcava milhares de itens zerados como "precisa comprar".
-- Passa a considerar só insumo que está em ALGUM kit (composicao) OU que tem
-- saldo != 0. As colunas seguem iguais — sem regenerar tipos.
-- ============================================================================
create or replace view estoque.ponto_de_pedido_view with (security_invoker = true) as
select
  s.insumo_id,
  s.nome,
  s.unidade,
  s.saldo,
  s.consumo_dia,
  s.lead_time_dias,
  s.estoque_min,
  (s.consumo_dia * s.lead_time_dias + s.estoque_min) as ponto_pedido,
  (s.saldo <= (s.consumo_dia * s.lead_time_dias + s.estoque_min)) as precisa_comprar,
  greatest(
    ceil((s.consumo_dia * s.lead_time_dias + s.estoque_min) - s.saldo),
    0
  ) as sugestao_compra
from estoque.saldo_insumo s
where s.insumo_id in (select c.insumo_id from estoque.composicao c)
   or coalesce(s.saldo, 0) <> 0;
