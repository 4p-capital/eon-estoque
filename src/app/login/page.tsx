import { LogoEon } from "@/app/_components/logo-eon";
import { LoginForm } from "@/app/login/_components/login-form";

// Tela de login standalone (sem casca do app — ver AppShell). Layout monocromático
// claro: a classe `light` força os tokens claros mesmo se o tema global estiver em
// dark. Marca centralizada à esquerda + formulário à direita. Cores via tokens
// semânticos (bg-card / text-foreground), nunca cor crua.
export default function LoginPage() {
  return (
    <main className="light grid min-h-screen bg-card text-foreground lg:grid-cols-2">
      {/* Esquerda — marca centralizada, monocromática */}
      <div className="hidden flex-col items-center justify-center gap-3 border-r border-border px-12 text-center lg:flex">
        <LogoEon className="h-12 text-foreground" />
        <p className="text-xs font-normal uppercase tracking-[0.3em] text-foreground">
          Produções
        </p>
        <h2 className="mt-6 max-w-md text-2xl font-normal leading-tight tracking-tight text-foreground xl:text-3xl">
          Criamos soluções que duram, impactam e evoluem com o tempo.
        </h2>
      </div>

      {/* Direita — formulário */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <LogoEon className="mb-10 h-8 text-foreground lg:hidden" />

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
