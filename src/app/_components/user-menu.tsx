"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

import { sair } from "@/app/login/actions";

export function UserMenu({ userEmail }: { userEmail: string | null }) {
  const [open, setOpen] = useState(false);
  const inicial = (userEmail?.[0] ?? "U").toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Conta"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-full bg-preto text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {inicial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-lg border border-bege-claro bg-white shadow-lg"
        >
          <div className="border-b border-bege-claro px-4 py-3">
            <p className="truncate text-sm font-medium text-preto" title={userEmail ?? undefined}>
              {userEmail ?? "Usuário"}
            </p>
            <p className="text-xs text-cinza/50">Acesso ao estoque</p>
          </div>
          <form action={sair}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-cinza transition-colors hover:bg-bege-claro/50 hover:text-preto"
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
