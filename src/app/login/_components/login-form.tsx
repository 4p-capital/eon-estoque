"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { entrar, type LoginState } from "@/app/login/actions";

const INITIAL: LoginState = {};

// Form vive no painel escuro do login — tokens semânticos no escopo `.dark`
// (ver page.tsx). Campos elevados em `bg-secondary`; botão branco em
// `bg-foreground`; links de ação em `text-primary` (azul da marca).
const labelCls = "mb-1.5 block text-sm font-medium text-foreground";
const inputCls =
  "block w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function LoginForm() {
  const [state, formAction] = useActionState(entrar, INITIAL);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className={labelCls}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputCls}
          placeholder="seu@email.com"
        />
      </div>

      <div>
        <label htmlFor="password" className={labelCls}>
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${inputCls} pr-11`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() =>
              toast.info("Recuperação de senha em breve — fale com o administrador.")
            }
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Esqueceu sua senha?
          </button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton className="h-11 w-full bg-foreground text-background hover:bg-foreground/90">
        Entrar
      </SubmitButton>

      <p className="text-center text-xs text-muted-foreground">
        Acesso restrito — contas são criadas pelo administrador.
      </p>
    </form>
  );
}
