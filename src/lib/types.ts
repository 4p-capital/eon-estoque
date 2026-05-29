// Tipos do domínio derivados das views do Postgres (schema `estoque`).
// Fonte da verdade: database.types.ts (gerado via `supabase gen types`).
// Regenerar após mudança de schema:
//   pnpm exec supabase gen types typescript --project-id <ref> --schema public --schema estoque > src/lib/database.types.ts

import type { Database } from "@/lib/database.types";

type EstoqueViews = Database["estoque"]["Views"];
type EstoqueTables = Database["estoque"]["Tables"];

export type KitPossivel = EstoqueViews["kits_possiveis_view"]["Row"];
export type PontoPedido = EstoqueViews["ponto_de_pedido_view"]["Row"];
export type SaldoInsumo = EstoqueViews["saldo_insumo"]["Row"];

export type Insumo = EstoqueTables["insumo"]["Row"];
export type InsumoInsert = EstoqueTables["insumo"]["Insert"];
export type TipoKit = EstoqueTables["tipo_kit"]["Row"];
export type Empreendimento = EstoqueTables["empreendimento"]["Row"];
export type Local = EstoqueTables["local"]["Row"];
export type Lote = EstoqueTables["lote"]["Row"];
export type UnidadeKit = EstoqueTables["unidade_kit"]["Row"];
