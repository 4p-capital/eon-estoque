"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { NovoCertificadoForm } from "@/app/fiscal/_components/novo-certificado-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type EmpreendimentoOption = { id: string; nome: string };

// Botão "Cadastrar certificado" que abre o formulário num drawer (Sheet).
export function NovoCertificadoDrawer({
  empreendimentos,
}: {
  empreendimentos: EmpreendimentoOption[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button type="button">
          <Plus className="size-4" aria-hidden />
          Cadastrar certificado
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(32rem,100vw)] gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading">Novo certificado</SheetTitle>
          <SheetDescription>
            Suba o .pfx da SPE e informe a senha. CNPJ, razão social e validade são lidos do próprio
            certificado.
          </SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <NovoCertificadoForm
            empreendimentos={empreendimentos}
            onSuccess={() => setAberto(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
