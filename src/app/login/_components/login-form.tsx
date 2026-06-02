"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { inputCls } from "@/app/_components/form-styles";
import { entrar, type LoginState } from "@/app/login/actions";

const INITIAL: LoginState = {};

// Form vive no painel de marca (violeta) — labels claras, campos light.
const labelCls = "block text-sm font-medium text-primary-foreground/80";

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
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
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
            className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground"
          >
            Esqueceu sua senha?
          </button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-primary-foreground">
          {state.error}
        </p>
      )}

      <SubmitButton variant="secondary" className="w-full">
        Entrar
      </SubmitButton>

      <p className="text-center text-xs text-primary-foreground/50">
        Acesso restrito — usuários são criados pelo administrador.
      </p>
    </form>
  );
}
