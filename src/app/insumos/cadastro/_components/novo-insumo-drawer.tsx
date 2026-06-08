"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { InsumoForm } from "@/app/insumos/cadastro/_components/insumo-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Botão "Cadastrar insumo" que abre o formulário num drawer (Sheet). Avisa o pai
// via onCreated para recarregar a lista do catálogo.
export function NovoInsumoDrawer({ onCreated }: { onCreated: () => void }) {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button type="button">
          <Plus className="size-4" aria-hidden />
          Cadastrar insumo
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(32rem,100vw)] gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading">Novo insumo</SheetTitle>
          <SheetDescription>
            Cadastre o item do catálogo. O saldo aparece em Estoque após a entrada.
          </SheetDescription>
        </SheetHeader>
        <InsumoForm
          onSuccess={() => {
            onCreated();
            setAberto(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
