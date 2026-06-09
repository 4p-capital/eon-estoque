// Edge Function: importar-ncm
// Baixa a tabela oficial de NCM (Receita/Siscomex) e popula estoque.ncm.
// Re-executável (upsert por código) — disparo manual agora, pg_cron mensal depois.
//
// Autorização: galpão admin (JWT) OU service_role (cron). A escrita usa um client
// service_role (bypassa RLS) porque é um job em lote de dados de referência.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { clientFromRequest } from "../_shared/client.ts";

const URL_NCM =
  "https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json";
const TAMANHO_LOTE = 1000;

type ItemOficial = {
  Codigo?: string;
  Descricao?: string;
  Data_Inicio?: string;
  Data_Fim?: string;
  Tipo_Ato_Ini?: string;
  Numero_Ato_Ini?: string;
  Ano_Ato_Ini?: string;
};

type LinhaNcm = {
  codigo: string;
  codigo_formatado: string;
  nivel: number;
  descricao: string;
  descricao_completa: string;
  data_inicio: string | null;
  data_fim: string | null;
  ato: string | null;
};

// "DD/MM/YYYY" -> "YYYY-MM-DD" (ou null se vazio/inválido).
function dataIso(valor: string | undefined): string | null {
  if (!valor) return null;
  const m = valor.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// Remove os hífens de hierarquia que a Receita usa no início da descrição.
function limpaDescricao(texto: string): string {
  return texto.replace(/^[-\s]+/, "").trim();
}

function montaAto(item: ItemOficial): string | null {
  const tipo = item.Tipo_Ato_Ini?.trim();
  const numero = item.Numero_Ato_Ini?.trim();
  const ano = item.Ano_Ato_Ini?.trim();
  if (!tipo && !numero) return null;
  return [tipo, numero && ano ? `${numero}/${ano}` : numero].filter(Boolean).join(" ");
}

// Acha o array de nomenclaturas dentro do JSON (chave varia: "Nomenclaturas").
function extrairItens(payload: unknown): ItemOficial[] {
  if (Array.isArray(payload)) return payload as ItemOficial[];
  if (payload && typeof payload === "object") {
    for (const valor of Object.values(payload as Record<string, unknown>)) {
      if (Array.isArray(valor)) return valor as ItemOficial[];
    }
  }
  return [];
}

function transformar(itens: ItemOficial[]): LinhaNcm[] {
  // Mapa código(dígitos) -> descrição limpa, para montar o breadcrumb por prefixo.
  const porCodigo = new Map<string, string>();
  for (const it of itens) {
    const codigo = (it.Codigo ?? "").replace(/\D/g, "");
    if (codigo) porCodigo.set(codigo, limpaDescricao(it.Descricao ?? ""));
  }

  const linhas: LinhaNcm[] = [];
  for (const it of itens) {
    const bruto = it.Codigo ?? "";
    const codigo = bruto.replace(/\D/g, "");
    const descricao = limpaDescricao(it.Descricao ?? "");
    if (!codigo || !descricao) continue;

    // Breadcrumb: ancestrais por prefixo (2,4,6) + o próprio nó.
    const partes: string[] = [];
    for (let len = 2; len <= codigo.length; len += 2) {
      const ancestral = porCodigo.get(codigo.slice(0, len));
      if (ancestral) partes.push(ancestral);
    }

    linhas.push({
      codigo,
      codigo_formatado: bruto.trim(),
      nivel: Math.ceil(codigo.length / 2),
      descricao,
      descricao_completa: partes.join(" › ") || descricao,
      data_inicio: dataIso(it.Data_Inicio),
      data_fim: dataIso(it.Data_Fim),
      ato: montaAto(it),
    });
  }
  return linhas;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Autorização: service_role (cron) ou galpão admin (JWT do chamador).
    const authHeader = req.headers.get("Authorization") ?? "";
    const ehServiceRole = authHeader === `Bearer ${serviceKey}`;
    if (!ehServiceRole) {
      const chamador = clientFromRequest(req);
      const { data: galpao } = await chamador.rpc("is_galpao");
      if (galpao !== true) return json({ error: "Sem permissão para importar a base NCM." }, 403);
    }

    const resp = await fetch(URL_NCM, { headers: { Accept: "application/json" } });
    if (!resp.ok) return json({ error: `SEFAZ/Siscomex respondeu ${resp.status}.` }, 502);

    const itens = extrairItens(await resp.json());
    const linhas = transformar(itens);
    if (linhas.length === 0) return json({ error: "Nenhum item NCM no payload oficial." }, 502);

    const admin = createClient(supabaseUrl, serviceKey, {
      db: { schema: "estoque" },
      auth: { persistSession: false },
    });

    let lotes = 0;
    for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
      const fatia = linhas.slice(i, i + TAMANHO_LOTE);
      const { error } = await admin.from("ncm").upsert(fatia, { onConflict: "codigo" });
      if (error) {
        console.error("[importar-ncm] upsert lote", lotes, error);
        return json({ error: "Falha ao gravar a base NCM.", detalhe: error.message }, 500);
      }
      lotes += 1;
    }

    return json({ ok: true, total: linhas.length, lotes });
  } catch (e) {
    console.error("[importar-ncm]", e);
    return json({ error: "Erro ao importar a base NCM." }, 500);
  }
});
