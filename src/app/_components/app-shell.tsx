"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/app/_components/app-sidebar";

type Props = {
  userEmail: string | null;
  children: React.ReactNode;
};

// Casca do app: sidebar + conteúdo (sem header — o colapso e o tema vivem na
// própria sidebar). Some na tela de login.
export function AppShell({ userEmail, children }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        collapsed={collapsed}
        userEmail={userEmail}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
