import type { Metadata } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";

import { AppShell } from "@/app/_components/app-shell";
import { ThemeProvider } from "@/app/_components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getSessao } from "@/lib/auth/sessao";
import "./globals.css";

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

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AppShell userEmail={sessao?.email ?? null} papel={sessao?.papel ?? null}>
            {children}
          </AppShell>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
