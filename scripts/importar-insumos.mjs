// ============================================================================
// Importa o catálogo de insumos do Sienge (XLSX) para estoque.insumo.
// Idempotente: faz UPSERT por codigo_sienge — pode rodar de novo a cada
// reexportação do Sienge sem duplicar.
//
// Pré-requisitos no .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...   (Dashboard > Settings > API > service_role)
//
// Uso:  node scripts/importar-insumos.mjs [caminho/arquivo.xlsx]
//       (default: data/insumos-sienge.xlsx)
// ============================================================================

import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

const ARQUIVO = process.argv[2] ?? "data/insumos-sienge.xlsx";
const LOTE = 500;

// Colunas da planilha do Sienge (0-indexadas).
const COL = { codigo: 0, descricao: 1, unidade: 6 };

function carregarEnv() {
  const linhas = readFileSync(".env.local", "utf8").split(/\r?\n/);
  const env = {};
  for (const linha of linhas) {
    if (!linha || linha.startsWith("#")) continue;
    const i = linha.indexOf("=");
    if (i > 0) env[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  }
  return env;
}

function lerInsumos() {
  const wb = XLSX.read(readFileSync(ARQUIVO), { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    raw: false,
    defval: "",
  });
  const itens = [];
  for (const r of rows) {
    const codigo = String(r[COL.codigo] ?? "").trim();
    const nome = String(r[COL.descricao] ?? "").trim();
    if (!/^\d+$/.test(codigo) || !nome) continue; // pula cabeçalhos/seções
    itens.push({
      codigo_sienge: codigo,
      nome,
      unidade: String(r[COL.unidade] ?? "").trim() || "un",
    });
  }
  return itens;
}

async function main() {
  const env = carregarEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const usarService = serviceKey && !serviceKey.startsWith("cole-");
  // Sem service role, cai na anon key (exige policy de insert para anon — ver setup).
  const key = usarService ? serviceKey : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("[importar] Falta NEXT_PUBLIC_SUPABASE_URL e uma chave (service role ou anon) no .env.local.");
    process.exit(1);
  }
  console.log(`[importar] usando chave: ${usarService ? "service_role" : "anon (precisa de policy temporária)"}`);

  const itens = lerInsumos();
  console.log(`[importar] ${itens.length} insumos lidos de ${ARQUIVO}.`);

  // PostgREST direto (sem supabase-js -> sem Realtime/WebSocket). Upsert por
  // codigo_sienge via Prefer: resolution=merge-duplicates. Schema via Content-Profile.
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/insumo?on_conflict=codigo_sienge`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "Content-Profile": "estoque",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };

  let gravados = 0;
  for (let i = 0; i < itens.length; i += LOTE) {
    const lote = itens.slice(i, i + LOTE);
    const resp = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(lote) });
    if (!resp.ok) {
      console.error(`[importar] erro no lote ${i}-${i + lote.length}: HTTP ${resp.status}`, await resp.text());
      process.exit(1);
    }
    gravados += lote.length;
    console.log(`[importar] ${gravados}/${itens.length}`);
  }

  console.log(`\n[importar] ✅ ${gravados} insumos importados/atualizados.`);
}

main().catch((err) => {
  console.error("[importar] FALHA:", err.message);
  process.exit(1);
});
