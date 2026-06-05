import Image from "next/image";

import { LogoEon } from "@/app/_components/logo-eon";
import { LoginForm } from "@/app/login/_components/login-form";

// Tela de login standalone (sem casca do app — ver AppShell). Layout de marca:
// capa fotográfica à esquerda + painel escuro com o form à direita. O escopo é
// forçado em `.dark` para a estética da referência sair dos tokens semânticos
// (near-black em --background, botão branco em --foreground), sem cor crua.
export default function LoginPage() {
  return (
    <main className="dark grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      {/* Esquerda — capa fotográfica (b&w) com marca e mensagem */}
      <div className="relative hidden flex-col justify-start overflow-hidden bg-secondary p-12 lg:flex xl:p-16">
        <Image
          src="/EON.png"
          alt=""
          fill
          priority
          unoptimized
          sizes="50vw"
          className="object-cover grayscale"
        />
        {/* Véu para legibilidade do texto sobre a foto */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />

        <div className="relative">
          <LogoEon className="h-7 text-white" />
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
            Produções
          </p>

          <h2 className="mt-8 max-w-lg text-[24px] font-bold leading-tight tracking-tight text-white xl:text-[32px]">
            Criamos soluções que duram, impactam e evoluem com o tempo.
          </h2>
        </div>
      </div>

      {/* Direita — painel escuro com o formulário */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <LogoEon className="mb-10 h-6 text-foreground lg:hidden" />

          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Bem-vindo de volta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesse o controle de estoque da EON.
          </p>

          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
