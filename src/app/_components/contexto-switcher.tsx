"use client";

import { useTransition } from "react";
import { Building2, ChevronsUpDown, LogOut, Warehouse } from "lucide-react";

import { definirContexto } from "@/app/_components/contexto-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type TenantOpcao = { id: string; nome: string };

type Props = {
  collapsed: boolean;
  modo: "operacao" | "tenant";
  vinculadoId: string | null; // tenant que o galpão pode "entrar" (ex.: EON)
  vinculadoNome: string | null;
};

// Switcher de CONTEXTO (não é filtro): alterna entre a operação do galpão e a
// área do tenant vinculado (ex.: EON). O filtro por cliente vive nas telas
// operacionais (estoque/produção/saída), não aqui.
export function ContextoSwitcher({ collapsed, modo, vinculadoId, vinculadoNome }: Props) {
  const [pending, start] = useTransition();

  function trocar(valor: string) {
    start(() => definirContexto(valor));
  }

  const dentro = modo === "tenant";
  const titulo = dentro ? (vinculadoNome ?? "Tenant") : "Operação";
  const subtitulo = dentro ? "Área do cliente" : "Galpão — todos os clientes";

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
        <DropdownMenuLabel>Contexto</DropdownMenuLabel>
        {dentro ? (
          <DropdownMenuItem onClick={() => trocar("operacao")}>
            <Warehouse className="size-4" />
            <span className="flex-1">Voltar à operação</span>
          </DropdownMenuItem>
        ) : vinculadoId ? (
          <DropdownMenuItem onClick={() => trocar(`tenant:${vinculadoId}`)}>
            <Building2 className="size-4" />
            <span className="flex-1 truncate">Entrar no tenant {vinculadoNome}</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <LogOut className="size-4" />
            <span className="flex-1">Sem tenant vinculado</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
