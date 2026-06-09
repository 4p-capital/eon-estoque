import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Papel } from "@/lib/auth/papel";

// ⚠️ Client com service_role: BYPASSA RLS. NUNCA importar em Client Component
// (o "server-only" acima quebra o build se alguém tentar). Use só em Server
// Actions / Route Handlers, e SEMPRE valide o papel do chamador antes.
//
// Tipos mínimos das tabelas novas (tenant/perfil) até regenerarmos
// database.types.ts contra o schema multi-tenant aplicado. Mantém type-safety
// nas actions de provisionamento sem poluir o arquivo gerado (que será
// reconciliado por `supabase gen types` após o cutover).

type TenantRow = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  onboarding_completo: boolean;
  created_at: string;
  updated_at: string;
};

type PerfilRow = {
  id: string;
  tenant_id: string | null;
  papel: Papel;
  nome: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

// Cofre fiscal: lido via service_role para a consulta SEFAZ (o galpão é cego à
// RLS de `spe`). Só os campos que a consulta usa; o certificado/senha nunca saem
// do servidor.
type SpeRow = {
  id: string;
  razao_social: string;
  cnpj: string;
  uf: string | null;
  empreendimento_id: string | null;
  certificado_cifrado: string;
  senha_cifrada: string;
  tenant_id: string | null;
  ativo: boolean;
};

type AdminSchema = {
  estoque: {
    Tables: {
      tenant: {
        Row: TenantRow;
        Insert: {
          id?: string;
          nome: string;
          slug: string;
          ativo?: boolean;
          onboarding_completo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<TenantRow>;
        Relationships: [];
      };
      perfil: {
        Row: PerfilRow;
        Insert: {
          id: string;
          tenant_id?: string | null;
          papel: Papel;
          nome?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PerfilRow>;
        Relationships: [];
      };
      spe: {
        Row: SpeRow;
        Insert: Partial<SpeRow>;
        Update: Partial<SpeRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Admin client indisponível: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient<AdminSchema, "estoque">(url, serviceRoleKey, {
    db: { schema: "estoque" },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
