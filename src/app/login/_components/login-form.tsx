"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { entrar, type LoginState } from "@/app/login/actions";

const INITIAL: LoginState = {};

// Tema escuro (form vive no painel preto do login).
const labelCls = "block text-sm font-medium text-white/80";
const inputCls =
  "block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white shadow-sm transition-colors placeholder:text-white/30 focus-visible:border-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20";

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
          className={`mt-1.5 ${inputCls}`}
          placeholder="voce@eonbr.com"
        />
      </div>

      <div>
        <label htmlFor="password" className={labelCls}>
          Senha
        </label>
        <div className="relative mt-1.5">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${inputCls} pr-10`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-white/40 transition-colors hover:text-white/80"
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
            className="text-sm text-white/50 transition-colors hover:text-white/90"
          >
            Esqueceu sua senha?
          </button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-400">
          {state.error}
        </p>
      )}

      <SubmitButton tone="inverse" className="w-full">
        Entrar
      </SubmitButton>

      <p className="text-center text-xs text-white/40">
        Acesso restrito — usuários são criados pelo administrador.
      </p>
    </form>
  );
}
