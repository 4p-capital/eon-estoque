// Base pública do app (https://ops.eonbr.com) para montar links que saem do
// sistema: o QR da etiqueta do kit (/k/<token>) e o QR da OS de expedição
// (/os/<token>). Vem de NEXT_PUBLIC_SITE_URL; no dev (sem env) cai na origem
// atual do browser. Normaliza a barra final — "https://x.com/" + "/k/..."
// geraria "//k/..." no QR impresso.
export function publicBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (env) return env;
  return typeof window !== "undefined" ? window.location.origin : "";
}
