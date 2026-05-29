"use client";

import { Menu } from "lucide-react";

import { UserMenu } from "@/app/_components/user-menu";

type Props = {
  userEmail: string | null;
  onToggle: () => void;
};

export function TopBar({ userEmail, onToggle }: Props) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-white px-4">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Alternar menu lateral"
        className="rounded-md border border-bege-claro p-2 text-cinza transition-colors hover:bg-bege-claro/50 hover:text-preto"
      >
        <Menu className="size-4" aria-hidden />
      </button>

      <UserMenu userEmail={userEmail} />
    </header>
  );
}
