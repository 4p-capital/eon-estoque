"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/app/_components/submit-button";
import { entrar, type LoginState } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/client";

const INITIAL: LoginState = {};

// Tokens semânticos no escopo `.dark` do painel de login (ver page.tsx).
const labelCls = "mb-1.5 block text-sm font-medium text-foreground";
const inputCls =
  "block w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const primaryBtnCls =
  "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60";
const linkBtnCls =
  "font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-60";

type Modo = "email" | "codigo" | "senha";

function EmailInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        placeholder="seu@email.com"
      />
    </div>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(entrar, INITIAL);
  const [modo, setModo] = useState<Modo>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  async function enviarCodigo() {
    const alvo = email.trim();
    if (!alvo) {
      toast.error("Informe o e-mail para receber o código.");
      return;
    }
    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: alvo,
      options: { shouldCreateUser: false },
    });
    setEnviando(false);
    if (error) {
      console.error("[auth] signInWithOtp", error);
      toast.error("Não foi possível enviar o código. Confira o e-mail e tente de novo.");
      return;
    }
    setModo("codigo");
    toast.success("Código enviado — confira seu e-mail.");
  }

  async function confirmarCodigo() {
    const token = codigo.trim();
    if (token.length < 6) {
      toast.error("Digite o código de 6 dígitos do e-mail.");
      return;
    }
    setVerificando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    if (error) {
      setVerificando(false);
      console.error("[auth] verifyOtp", error);
      toast.error("Código inválido ou expirado. Peça um novo e tente de novo.");
      return;
    }
    // Vai pra home — que roteia o cliente com onboarding pendente pro /onboarding.
    window.location.assign("/");
  }

  // ── Passo: SENHA (opcional) ────────────────────────────────────────────────
  if (modo === "senha") {
    return (
      <form action={formAction} className="space-y-5">
        <EmailInput value={email} onChange={setEmail} />
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
        </div>

        {state.error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {state.error}
          </p>
        )}

        <SubmitButton className="h-11 w-full bg-foreground text-background hover:bg-foreground/90">
          Entrar
        </SubmitButton>

        <div className="text-center">
          <button type="button" onClick={() => setModo("email")} className={`text-sm ${linkBtnCls}`}>
            Entrar com código por e-mail
          </button>
        </div>
      </form>
    );
  }

  // ── Passo: CÓDIGO (OTP) ────────────────────────────────────────────────────
  if (modo === "codigo") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          confirmarCodigo();
        }}
        className="space-y-4"
      >
        <p className="text-sm text-muted-foreground">
          Enviamos um código de 6 dígitos para{" "}
          <strong className="text-foreground">{email}</strong>.
        </p>
        <div>
          <label htmlFor="codigo" className={labelCls}>
            Código
          </label>
          <input
            id="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            className={`${inputCls} text-center text-lg tracking-[0.5em]`}
            placeholder="000000"
          />
        </div>
        <button type="submit" disabled={verificando} className={primaryBtnCls}>
          {verificando && <Loader2 className="size-4 animate-spin" />}
          {verificando ? "Verificando…" : "Entrar"}
        </button>
        <div className="flex justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setModo("email");
              setCodigo("");
            }}
            className="flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Trocar e-mail
          </button>
          <button type="button" onClick={enviarCodigo} disabled={enviando} className={linkBtnCls}>
            Reenviar código
          </button>
        </div>
      </form>
    );
  }

  // ── Passo: E-MAIL (inicial — padrão passwordless) ──────────────────────────
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviarCodigo();
      }}
      className="space-y-5"
    >
      <EmailInput value={email} onChange={setEmail} />

      <button type="submit" disabled={enviando} className={primaryBtnCls}>
        {enviando ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        {enviando ? "Enviando código…" : "Receber código por e-mail"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={() => setModo("senha")}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary text-sm font-medium text-foreground transition-colors hover:bg-secondary/70"
      >
        <Lock className="size-4" />
        Entrar com senha
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Acesso restrito — contas são criadas pelo administrador.
      </p>
    </form>
  );
}
