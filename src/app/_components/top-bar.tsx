"use client";

import { Menu } from "lucide-react";

import { ThemeToggle } from "@/app/_components/theme-toggle";
import { UserMenu } from "@/app/_components/user-menu";
import { Button } from "@/components/ui/button";

type Props = {
  userEmail: string | null;
  onToggle: () => void;
};

export function TopBar({ userEmail, onToggle }: Props) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggle}
        aria-label="Alternar menu lateral"
      >
        <Menu className="size-4" aria-hidden />
      </Button>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu userEmail={userEmail} />
      </div>
    </header>
  );
}
