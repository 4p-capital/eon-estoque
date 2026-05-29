// Tipos do domínio (espelham as views do Postgres).
// Depois de conectar o projeto, dá para gerar tipos completos com:
//   supabase gen types typescript --local > src/lib/database.types.ts

export type KitPossivel = {
  tipo_kit_id: string;
  tipo_kit_nome: string;
  qtd_possivel: number;
  insumo_gargalo_id: string | null;
  insumo_gargalo_nome: string | null;
};

export type PontoPedido = {
  insumo_id: string;
  nome: string;
  unidade: string;
  saldo: number;
  consumo_dia: number;
  lead_time_dias: number;
  estoque_min: number;
  ponto_pedido: number;
  precisa_comprar: boolean;
  sugestao_compra: number;
};
