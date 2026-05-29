import { Construction } from "lucide-react";

export function EmBreve({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-preto">{titulo}</h1>
        <p className="mt-1 text-sm text-cinza/70">{descricao}</p>
      </header>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-bege bg-bege-claro/30 p-6 text-sm text-cinza">
        <Construction className="size-5 text-amber-500" aria-hidden />
        Tela em construção.
      </div>
    </main>
  );
}
