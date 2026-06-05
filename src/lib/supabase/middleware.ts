import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isPapel, type Papel } from "@/lib/auth/papel";

// Rotas acessíveis sem login. "/k" = consulta pública de kit pelo QR (página
// externa que o QR aponta). "/auth" = callback do magic link (estabelece a sessão).
const PUBLIC_ROUTES = ["/login", "/k", "/auth"];

// Gating por papel (M2). O split completo de áreas galpão×tenant é o M4; aqui só
// protegemos as rotas novas: provisionamento (galpão) e equipe (tenant).
const ROTAS_POR_PAPEL: { prefix: string; permitido: (papel: Papel | null) => boolean }[] = [
  { prefix: "/clientes", permitido: (p) => p === "galpao_admin" },
  { prefix: "/equipe", permitido: (p) => p === "tenant_admin" },
];

// Renova a sessão do usuário a cada request (padrão @supabase/ssr) e protege
// as rotas: sem sessão -> manda pro /login; com sessão no /login -> vai pro app.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: não rode código entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (!user && !isPublic) {
    return redirectTo(request, "/login", supabaseResponse);
  }
  if (user && pathname === "/login") {
    return redirectTo(request, "/dashboard", supabaseResponse);
  }

  // Gating por papel das rotas restritas (lê app_metadata do JWT).
  if (user) {
    const rawPapel = user.app_metadata?.papel;
    const papel = isPapel(rawPapel) ? rawPapel : null;
    const regra = ROTAS_POR_PAPEL.find(
      (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
    );
    if (regra && !regra.permitido(papel)) {
      return redirectTo(request, "/dashboard", supabaseResponse);
    }
  }

  return supabaseResponse;
}

// Redireciona preservando os cookies de sessão já setados.
function redirectTo(request: NextRequest, path: string, base: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  const redirect = NextResponse.redirect(url);
  base.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
  return redirect;
}
