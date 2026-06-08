"use client";

import { useState } from "react";
import { Truck } from "lucide-react";

import { AbrirSaidaForm } from "@/app/saida/_components/abrir-saida-form";
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

// Botão "Nova saída" que abre o formulário de abertura de remessa num drawer.
export function NovaSaidaDrawer({ empreendimentos }: { empreendimentos: Opcao[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button type="button">
          <Truck className="size-4" aria-hidden />
          Nova saída
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(32rem,100vw)] gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading">Nova saída</SheetTitle>
          <SheetDescription>
            Abra uma remessa pra um empreendimento. Depois bipe o QR de cada kit que vai sair.
          </SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <AbrirSaidaForm empreendimentos={empreendimentos} onSuccess={() => setAberto(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
