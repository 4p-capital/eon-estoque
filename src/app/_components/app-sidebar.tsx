"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { NAV, isGroup, type NavGroup, type NavItem } from "@/app/_components/nav-links";
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

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const allHrefs = NAV.flatMap((s) =>
    s.entries.flatMap((e) => (isGroup(e) ? e.children.map((c) => c.href) : [e.href])),
  );
  const active = activeHref(pathname, allHrefs);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center", collapsed ? "justify-center px-3" : "px-5")}>
        <Link href="/" aria-label="EON Estoque" className="inline-flex">
          {collapsed ? (
            <span className="text-base font-bold tracking-tight">EP</span>
          ) : (
            <span className="font-heading text-sm font-bold uppercase tracking-tight">
              EON <span className="font-normal text-muted-foreground">Produções</span>
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {NAV.map((section, i) => (
          <div key={section.title ?? `s${i}`} className="space-y-0.5">
            {section.title && !collapsed && (
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                {section.title}
              </p>
            )}
            {section.entries.map((entry) =>
              isGroup(entry) ? (
                <Group
                  key={entry.label}
                  group={entry}
                  collapsed={collapsed}
                  active={active}
                />
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
        "relative flex items-center gap-2.5 rounded-md py-1.5 text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed ? "justify-center px-2" : nested ? "pl-9 pr-2.5" : "px-2.5",
        "before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:transition-all before:duration-200",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground before:opacity-100"
          : "text-muted-foreground before:opacity-0 hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0 transition-colors", active && "text-primary")}
        aria-hidden
      />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && soon && (
        <Badge variant="secondary" className="ml-auto text-[9px] uppercase">
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

  // Modo colapsado: mostra só o ícone do grupo, linkando ao primeiro filho.
  if (collapsed) {
    return (
      <Link
        href={children[0].href}
        title={label}
        className={cn(
          "flex items-center justify-center rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          hasActiveChild && "bg-sidebar-accent text-primary",
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
          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-muted",
          hasActiveChild ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon
          className={cn("size-4 shrink-0", hasActiveChild && "text-primary")}
          aria-hidden
        />
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
        <div className="mt-0.5 space-y-0.5">
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
