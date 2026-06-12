// O QR dos kits codifica a URL pública /k/<token>; scanners (físicos ou câmera)
// entregam a URL inteira. Extrai o token (último segmento de /k/) ou usa o
// valor cru — aceita também o token puro digitado à mão.
export function tokenFromScan(valor: string): string {
  const t = valor.trim();
  const m = t.match(/\/k\/([^/?#\s]+)/);
  return m ? decodeURIComponent(m[1]) : t;
}
