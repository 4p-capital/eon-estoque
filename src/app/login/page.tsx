import { LogoEon } from "@/app/_components/logo-eon";
import { LoginForm } from "@/app/login/_components/login-form";

export default function LoginPage() {
  const ano = new Date().getFullYear();

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Esquerda — comunicação do sistema */}
      <div className="relative hidden flex-col justify-between bg-background px-16 py-12 lg:flex">
        <LogoEon className="h-6 text-foreground" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bege">
            Sistema interno · Estoque
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-foreground">
            Do insumo ao kit rastreado.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            Capacidade de produção, ponto de pedido e rastreio por QR — controle
            anti-furto numa só superfície.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          © {ano} EON Instalações · Controle de estoque
        </p>
      </div>

      {/* Direita — formulário (painel de marca, violeta) */}
      <div className="flex flex-col bg-primary px-6 py-10 text-primary-foreground sm:px-12 lg:px-16">
        <LogoEon className="h-6 text-primary-foreground lg:hidden" />

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm py-12">
            <h1 className="text-3xl font-semibold tracking-tight text-primary-foreground">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-sm text-primary-foreground/70">
              Acesse o controle de estoque da EON.
            </p>

            <div className="mt-8">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
