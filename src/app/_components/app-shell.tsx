"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/app/_components/app-sidebar";
import { TopBar } from "@/app/_components/top-bar";

type Props = {
  userEmail: string | null;
  children: React.ReactNode;
};

// Casca do app: sidebar + top bar + conteúdo. Segura o estado de colapso
// (compartilhado entre o botão do top bar e a sidebar). Some na tela de login.
export function AppShell({ userEmail, children }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <AppSidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userEmail={userEmail} onToggle={() => setCollapsed((c) => !c)} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
