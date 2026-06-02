"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { criarContagem } from "@/app/insumos/inventario/actions";
import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Empreendimento = { id: string; nome: string };

export function NovaContagemDrawer({ empreendimentos }: { empreendimentos: Empreendimento[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [empId, setEmpId] = useState("");
  const [regiao, setRegiao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empId) return toast.error("Selecione um empreendimento.");
    startTransition(async () => {
      const res = await criarContagem({ empreendimento_id: empId, regiao, observacao });
      if (res.error || !res.id) {
        toast.error(res.error ?? "Não foi possível criar a contagem.");
        return;
      }
      setAberto(false);
      router.push(`/insumos/inventario/${res.id}`);
    });
  }

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button type="button">
          <Plus className="size-4" aria-hidden />
          Nova contagem
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(30rem,100vw)] gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading">Nova contagem</SheetTitle>
          <SheetDescription>
            Escolha o empreendimento. Depois você adiciona os insumos contados e aplica.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label htmlFor="emp" className={labelCls}>
              Empreendimento
            </label>
            <select
              id="emp"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Selecione…</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="regiao" className={labelCls}>
              Região do galpão <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="regiao"
              value={regiao}
              onChange={(e) => setRegiao(e.target.value)}
              className={inputCls}
              placeholder="Ex.: Setor A, fundo"
            />
          </div>
          <div>
            <label htmlFor="obs" className={labelCls}>
              Observação <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className={inputCls}
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Criando…" : "Criar contagem"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
