"use client";

import { LogOut } from "lucide-react";

import { sair } from "@/app/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ userEmail }: { userEmail: string | null }) {
  const inicial = (userEmail?.[0] ?? "U").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Conta"
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
              {inicial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium" title={userEmail ?? undefined}>
            {userEmail ?? "Usuário"}
          </p>
          <p className="text-xs text-muted-foreground">Acesso ao estoque</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={sair}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
