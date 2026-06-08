import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

// Callback de e-mail (convite/magic link): o link aponta pra cá com `token_hash`
// (+ type) ou `code` (PKCE). Verifica, GRAVA os cookies de sessão NA resposta de
// redirect e manda pro app. O detalhe crítico: cookies setados pelo supabase
// precisam ser COPIADOS pro NextResponse.redirect, senão a sessão se perde e o
// proxy joga o usuário pro /login.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  // Resposta-placeholder onde o supabase grava os cookies da sessão.
  const store = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            store.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[auth] exchangeCodeForSession", error);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) console.error("[auth] verifyOtp", error);
    ok = !error;
  }

  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = ok ? next : "/login";
  if (!ok) {
    url.searchParams.set("erro", "link");
  }

  // Carrega os cookies de sessão (gravados no store) pra resposta de redirect.
  const redirect = NextResponse.redirect(url);
  store.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
