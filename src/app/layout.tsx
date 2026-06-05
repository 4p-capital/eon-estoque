import type { Metadata } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";

import { AppShell } from "@/app/_components/app-shell";
import type { SidebarContexto } from "@/app/_components/app-sidebar";
import { ThemeProvider } from "@/app/_components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getContexto, tenantAtivo } from "@/lib/auth/contexto";
import { getSessao } from "@/lib/auth/sessao";
import { createAdminClient } from "@/lib/supabase/admin";
import "./globals.css";

async function montarContexto(): Promise<SidebarContexto> {
  const sessao = await getSessao();
  const contexto = await getContexto(sessao);
  const base: SidebarContexto = {
    isGalpao: sessao?.isGalpao ?? false,
    modo: contexto?.modo ?? "operacao",
    tenantAtivoId: tenantAtivo(contexto),
    tenants: [],
    vinculadoId: sessao?.tenantId ?? null,
    vinculadoNome: null,
  };
  if (!sessao?.isGalpao) {
    return base;
  }
  // Galpão vê todos os tenants no filtro operacional. Resiliente: se o admin
  // client falhar (ex.: service_role ausente no ambiente), a casca ainda renderiza.
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("tenant").select("id, nome").order("nome");
    const tenants = data ?? [];
    return {
      ...base,
      tenants,
      vinculadoNome: sessao.tenantId
        ? (tenants.find((t) => t.id === sessao.tenantId)?.nome ?? null)
        : null,
    };
  } catch (err) {
    console.error("[layout] montarContexto tenants", err);
    return base;
  }
}

// Fonte do sistema: Montserrat (corpo e títulos). Variável → usada em
// --font-sans e --font-heading no globals.css.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

// Monoespaçada apenas para código/valores.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EON Estoque",
  description: "Controle inteligente de estoque — EON Instalações",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessao = await getSessao();
  const contexto = await montarContexto();

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AppShell userEmail={sessao?.email ?? null} contexto={contexto}>
            {children}
          </AppShell>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
