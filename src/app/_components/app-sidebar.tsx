"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";

import { sair } from "@/app/login/actions";
import {
  NAV_GALPAO,
  NAV_TENANT,
  isGroup,
  type NavGroup,
  type NavItem,
} from "@/app/_components/nav-links";
import { ContextoSwitcher, type TenantOpcao } from "@/app/_components/contexto-switcher";
import { ThemeToggle } from "@/app/_components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function matches(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Item ativo = aquele cujo href é o prefixo mais específico do pathname
// (resolve a colisão /insumos vs /insumos/cadastro).
function activeHref(pathname: string, hrefs: string[]): string {
  let best = "";
  for (const href of hrefs) {
    if (matches(pathname, href) && href.length > best.length) best = href;
  }
  return best;
}

function primeiroNome(email: string | null): string {
  if (!email) return "Usuário";
  const bruto = email.split("@")[0]?.split(/[._-]/)[0] ?? "Usuário";
  return bruto.charAt(0).toUpperCase() + bruto.slice(1);
}

export type SidebarContexto = {
  isGalpao: boolean;
  modo: "operacao" | "tenant";
  tenantAtivoId: string | null;
  tenants: TenantOpcao[];
  vinculadoId: string | null;
  vinculadoNome: string | null;
};

export function AppSidebar({
  collapsed,
  userEmail,
  contexto,
  onToggle,
}: {
  collapsed: boolean;
  userEmail: string | null;
  contexto: SidebarContexto;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const nav = contexto.modo === "tenant" ? NAV_TENANT : NAV_GALPAO;
  const allHrefs = nav.flatMap((s) =>
    s.entries.flatMap((e) => (isGroup(e) ? e.children.map((c) => c.href) : [e.href])),
  );
  const active = activeHref(pathname, allHrefs);
  const nome = primeiroNome(userEmail);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Setinha flutuante na borda — recolhe/expande o menu (substitui a header). */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        className="absolute -right-3 top-6 z-30 flex size-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md ring-2 ring-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5" aria-hidden />
        ) : (
          <ChevronLeft className="size-3.5" aria-hidden />
        )}
      </button>
      {/* Marca */}
      <div className={cn("flex h-16 items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-4")}>
        <Link href="/" aria-label="EON Produções" className="flex min-w-0 items-center">
          {collapsed ? (
            <span className="font-heading text-lg font-extrabold tracking-tight">EON</span>
          ) : (
            <span className="min-w-0">
              <span className="block truncate font-heading text-base leading-tight tracking-tight">
                <span className="font-extrabold">EON</span>{" "}
                <span className="font-normal">Produções</span>
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                Controle de Estoque
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* Perfil */}
      <div className={cn("flex items-center gap-2.5 border-b border-sidebar-border py-3", collapsed ? "justify-center px-2" : "px-4")}>
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white">
          {nome.charAt(0)}
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight">{nome}</span>
            <span className="block truncate text-[10px] text-muted-foreground">
              {userEmail ?? "—"}
            </span>
          </span>
        )}
      </div>

      {/* Switcher de contexto — só galpão alterna (operação × entrar no tenant). */}
      {contexto.isGalpao && (
        <div className={cn("border-b border-sidebar-border py-3", collapsed ? "px-2" : "px-3")}>
          <ContextoSwitcher
            collapsed={collapsed}
            modo={contexto.modo}
            vinculadoId={contexto.vinculadoId}
            vinculadoNome={contexto.vinculadoNome}
          />
        </div>
      )}

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {nav.map((section, i) => (
          <div key={section.title ?? `s${i}`} className="space-y-0.5">
            {section.title && !collapsed && (
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                {section.title}
              </p>
            )}
            {section.entries.map((entry) =>
              isGroup(entry) ? (
                <Group key={entry.label} group={entry} collapsed={collapsed} active={active} />
              ) : (
                <NavLink
                  key={entry.href}
                  item={entry}
                  collapsed={collapsed}
                  active={active === entry.href}
                />
              ),
            )}
          </div>
        ))}
      </nav>

      {/* Tema + Sair */}
      <div
        className={cn(
          "flex items-center gap-1 border-t border-sidebar-border p-3",
          collapsed ? "flex-col px-2" : "justify-between",
        )}
      >
        <form action={sair} className={cn(!collapsed && "min-w-0 flex-1")}>
          <button
            type="submit"
            title="Sair"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              collapsed && "justify-center px-2",
            )}
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            {!collapsed && <span>Sair</span>}
          </button>
        </form>
        <ThemeToggle />
      </div>
    </aside>
  );
}

function NavLink({
  item,
  collapsed,
  active,
  nested = false,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  nested?: boolean;
}) {
  const { href, label, icon: Icon, soon } = item;
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg py-2 text-[12px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed ? "justify-center px-2" : nested ? "pl-3 pr-2.5" : "px-2.5",
        active
          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && soon && (
        <Badge
          variant="secondary"
          className={cn("ml-auto text-[9px] uppercase", active && "bg-white/20 text-white")}
        >
          em breve
        </Badge>
      )}
    </Link>
  );
}

function Group({
  group,
  collapsed,
  active,
}: {
  group: NavGroup;
  collapsed: boolean;
  active: string;
}) {
  const { label, icon: Icon, children } = group;
  const hasActiveChild = children.some((c) => c.href === active);
  const [open, setOpen] = useState(hasActiveChild);

  if (collapsed) {
    return (
      <Link
        href={children[0].href}
        title={label}
        className={cn(
          "flex items-center justify-center rounded-lg px-2 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          hasActiveChild && "bg-muted text-blue-600 dark:text-blue-400",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-colors hover:bg-muted",
          hasActiveChild ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className={cn("size-4 shrink-0", hasActiveChild && "text-blue-600 dark:text-blue-400")} aria-hidden />
        <span className="truncate">{label}</span>
        <ChevronRight
          className={cn(
            "ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-90",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 border-l border-border pl-3 ml-[1.3rem]">
          {children.map((child) => (
            <NavLink
              key={child.href}
              item={child}
              collapsed={false}
              active={active === child.href}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}
