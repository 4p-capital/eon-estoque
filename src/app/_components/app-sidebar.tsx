"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, PackagePlus, QrCode, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/insumos", label: "Insumos", icon: Boxes },
  { href: "/tipos-kit", label: "Tipos de kit", icon: Wrench },
  { href: "/producao", label: "Produção", icon: PackagePlus },
  { href: "/saida", label: "Saída", icon: QrCode },
] as const;

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-bege-claro bg-bege-claro/40 transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-16 items-center", collapsed ? "justify-center px-3" : "px-5")}>
        <Link href="/dashboard" aria-label="EON Produções" className="inline-flex">
          {collapsed ? (
            <span className="text-base font-bold tracking-tight text-preto">EP</span>
          ) : (
            <span className="text-sm font-bold uppercase tracking-tight text-preto">
              EON <span className="font-normal text-cinza/60">Produções</span>
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center",
                active
                  ? "bg-white text-preto shadow-sm"
                  : "text-cinza/70 hover:bg-white/60 hover:text-preto",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
