import { LogoEon } from "@/app/_components/logo-eon";
import { LoginForm } from "@/app/login/_components/login-form";

// Tela de login standalone (sem casca do app — ver AppShell). Split de tema:
// container ESQUERDO claro (marca preta sobre branco, alinhada à esquerda) e
// container DIREITO escuro (formulário em dark). Cada lado força seu tema com
// `light`/`dark`, independente do tema global. Cores via tokens semânticos.
export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Esquerda — marca, fundo branco, alinhada à esquerda */}
      <div className="light hidden flex-col items-start justify-center border-r border-border bg-card px-12 text-foreground lg:flex xl:px-16">
        <LogoEon className="h-12 text-foreground" />
        <p className="mt-1 text-xs font-normal uppercase tracking-[0.3em] text-foreground">
          Produções
        </p>
        <h2 className="mt-6 max-w-md text-2xl font-normal leading-tight tracking-tight text-foreground xl:text-3xl">
          Criamos soluções que duram, impactam e evoluem com o tempo.
        </h2>
      </div>

      {/* Direita — painel escuro com o formulário */}
      <div className="dark flex flex-col justify-center bg-background px-6 py-12 text-foreground sm:px-12 lg:px-16">
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
