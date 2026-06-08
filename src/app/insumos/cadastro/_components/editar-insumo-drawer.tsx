"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { InsumoForm, type InsumoInicial } from "@/app/insumos/cadastro/_components/insumo-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Botão (lápis) que abre o form do insumo pré-preenchido para edição.
export function EditarInsumoDrawer({
  insumo,
  onSaved,
}: {
  insumo: InsumoInicial;
  onSaved: () => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Editar ${insumo.nome}`}
          className="size-8 text-muted-foreground hover:text-primary"
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(32rem,100vw)] gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading">Editar insumo</SheetTitle>
          <SheetDescription>
            Ajuste o nome, a unidade (ex.: <span className="font-medium">m</span>), o estoque mínimo e
            os parâmetros de compra.
          </SheetDescription>
        </SheetHeader>
        <InsumoForm
          inicial={insumo}
          onSuccess={() => {
            onSaved();
            setAberto(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
