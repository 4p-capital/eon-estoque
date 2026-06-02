"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { KitForm } from "@/app/tipos-kit/_components/kit-form";
import type { InsumoOption } from "@/app/tipos-kit/_components/insumo-picker";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Botão "Cadastrar kit" que abre um drawer (Sheet) com o formulário de cadastro.
export function NovoKitDrawer({ insumos }: { insumos: InsumoOption[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button type="button">
          <Plus className="size-4" aria-hidden />
          Cadastrar kit
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(34rem,100vw)] gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading">Novo kit</SheetTitle>
          <SheetDescription>
            Defina o nome e a composição (BOM). Adicione insumos buscando os existentes ou criando
            novos na hora.
          </SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <KitForm insumos={insumos} onSuccess={() => setAberto(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
