"use client";

import { useTransition } from "react";
import { Building2, Check, ChevronsUpDown, LogOut, Warehouse } from "lucide-react";

import { definirContexto } from "@/app/_components/contexto-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type TenantOpcao = { id: string; nome: string };

type Props = {
  collapsed: boolean;
  // Contexto atual (resolvido no servidor).
  modo: "operacao" | "tenant";
  tenantAtivoId: string | null; // filtro (operação) ou tenant atual (dentro)
  tenants: TenantOpcao[]; // todos os tenants (galpão vê todos no operacional)
  vinculadoId: string | null; // tenant que o galpão pode "entrar" (ex.: EON)
  vinculadoNome: string | null;
};

export function ContextoSwitcher({
  collapsed,
  modo,
  tenantAtivoId,
  tenants,
  vinculadoId,
  vinculadoNome,
}: Props) {
  const [pending, start] = useTransition();

  function trocar(valor: string) {
    start(() => definirContexto(valor));
  }

  const dentro = modo === "tenant";
  const filtroNome = tenantAtivoId
    ? tenants.find((t) => t.id === tenantAtivoId)?.nome ?? null
    : null;

  const titulo = dentro
    ? (vinculadoNome ?? "Tenant")
    : "Operação";
  const subtitulo = dentro
    ? "Área do cliente"
    : filtroNome
      ? `Filtrado: ${filtroNome}`
      : "Todos os clientes";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent disabled:opacity-60",
          collapsed && "justify-center px-2",
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            dentro ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {dentro ? <Building2 className="size-4" /> : <Warehouse className="size-4" />}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold leading-tight">{titulo}</span>
            <span className="block truncate text-[10px] text-muted-foreground">{subtitulo}</span>
          </span>
        )}
        {!collapsed && <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Operação do galpão</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => trocar("operacao")}>
          <Warehouse className="size-4" />
          <span className="flex-1">Todos os clientes</span>
          {!dentro && !tenantAtivoId && <Check className="size-4" />}
        </DropdownMenuItem>

        {tenants.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              Filtrar por cliente
            </DropdownMenuLabel>
            {tenants.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => trocar(`filtro:${t.id}`)}>
                <Building2 className="size-4" />
                <span className="flex-1 truncate">{t.nome}</span>
                {!dentro && tenantAtivoId === t.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {vinculadoId && (
          <>
            <DropdownMenuSeparator />
            {dentro ? (
              <DropdownMenuItem onClick={() => trocar("operacao")}>
                <LogOut className="size-4" />
                <span className="flex-1">Voltar à operação</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => trocar(`tenant:${vinculadoId}`)}>
                <Building2 className="size-4" />
                <span className="flex-1 truncate">Entrar no tenant {vinculadoNome}</span>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
