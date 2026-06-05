"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar, type SidebarContexto } from "@/app/_components/app-sidebar";

type Props = {
  userEmail: string | null;
  contexto: SidebarContexto;
  children: React.ReactNode;
};

// Casca do app: sidebar + conteúdo (sem header — o colapso e o tema vivem na
// própria sidebar). Some na tela de login.
export function AppShell({ userEmail, contexto, children }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Login, onboarding e a consulta pública de kit (/k/<token>) não usam a casca.
  if (pathname === "/login" || pathname === "/onboarding" || pathname.startsWith("/k/")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        collapsed={collapsed}
        userEmail={userEmail}
        contexto={contexto}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
