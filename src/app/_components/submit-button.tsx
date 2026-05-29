"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  // primary: preto sobre fundo claro. inverse: branco sobre fundo escuro.
  tone?: "primary" | "inverse";
};

const TONES = {
  primary:
    "bg-preto text-white hover:bg-cinza focus-visible:outline-preto",
  inverse:
    "bg-white text-preto hover:bg-bege-claro focus-visible:outline-white",
} as const;

// Botão de submit que mostra estado de envio (pega o pending do <form> pai).
export function SubmitButton({ children, className, tone = "primary" }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60",
        TONES[tone],
        className,
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
