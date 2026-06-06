"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";

import { AbrirLoteForm } from "@/app/producao/_components/abrir-lote-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Opcao = { id: string; nome: string };

// Botão "Cadastrar lote" que abre o formulário de abertura de lote num drawer.
export function NovoLoteDrawer({
  kits,
  empreendimentos,
}: {
  kits: Opcao[];
  empreendimentos: Opcao[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button type="button">
          <PackagePlus className="size-4" aria-hidden />
          Cadastrar lote
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(32rem,100vw)] gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading">Novo lote</SheetTitle>
          <SheetDescription>
            Escolha o tipo de kit e o empreendimento. Depois você gera as etiquetas e bipa a entrada
            dos kits no depósito.
          </SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <AbrirLoteForm
            kits={kits}
            empreendimentos={empreendimentos}
            onSuccess={() => setAberto(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
