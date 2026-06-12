"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, ScanLine } from "lucide-react";

import { inputCls, labelCls } from "@/app/_components/form-styles";
import { Button } from "@/components/ui/button";

const SCANNER_ELEMENT_ID = "os-scanner-camera";
const FPS_LEITURA = 10;
const QRBOX_PX = 230;

type EstadoCamera = "iniciando" | "ok" | "sem_camera";

// Leitor de QR pela câmera (html5-qrcode, classe headless — sem a UI própria da
// lib) + campo manual sempre visível (leitor físico/digitação). A lib só carrega
// no client, dentro do effect; refs seguram instância e a promise do start()
// para o cleanup sobreviver ao double-mount do StrictMode.
export function ScannerQr({ onScan }: { onScan: (texto: string) => void }) {
  const [camera, setCamera] = useState<EstadoCamera>("iniciando");
  const [manual, setManual] = useState("");
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let cancelado = false;
    // Tipos mínimos da lib (import dinâmico): start/stop/clear é tudo que usamos.
    let scanner: {
      start: (
        camera: { facingMode: string },
        config: { fps: number; qrbox: { width: number; height: number } },
        onSuccess: (texto: string) => void,
        onError: undefined,
      ) => Promise<null>;
      stop: () => Promise<void>;
      clear: () => void;
    } | null = null;
    let startPromise: Promise<null> | null = null;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelado) return;
      scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      startPromise = scanner.start(
        { facingMode: "environment" },
        { fps: FPS_LEITURA, qrbox: { width: QRBOX_PX, height: QRBOX_PX } },
        (texto) => onScanRef.current(texto),
        undefined,
      );
      try {
        await startPromise;
        if (!cancelado) setCamera("ok");
      } catch (err) {
        // Sem câmera, permissão negada ou contexto sem HTTPS — o campo manual cobre.
        if (!cancelado) {
          console.error("[os] scanner start", err);
          setCamera("sem_camera");
        }
      }
    })();

    return () => {
      cancelado = true;
      const s = scanner;
      if (!s) return;
      Promise.resolve(startPromise)
        .then(() => s.stop())
        .then(() => s.clear())
        .catch(() => {
          // start falhou ou stop em câmera já parada — nada a limpar.
        });
    };
  }, []);

  function onSubmitManual(e: React.FormEvent) {
    e.preventDefault();
    const codigo = manual.trim();
    if (!codigo) return;
    onScanRef.current(codigo);
    setManual("");
  }

  return (
    <div className="space-y-3">
      {camera !== "sem_camera" ? (
        <div className="overflow-hidden rounded-xl bg-foreground/90">
          <div id={SCANNER_ELEMENT_ID} className="mx-auto w-full [&_video]:w-full" />
          {camera === "iniciando" && (
            <p className="px-4 py-6 text-center text-sm text-background">Abrindo a câmera…</p>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          <CameraOff className="size-4 shrink-0" aria-hidden />
          Câmera indisponível (permissão negada ou sem câmera). Use o campo abaixo com um leitor
          ou digite o código da etiqueta.
        </p>
      )}

      <form onSubmit={onSubmitManual}>
        <label htmlFor="codigo-manual" className={labelCls}>
          Ou digite/bipe o código
        </label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <ScanLine
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="codigo-manual"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Código da etiqueta…"
              autoComplete="off"
              className={`${inputCls} mt-0 pl-9`}
            />
          </div>
          <Button type="submit" variant="outline">
            Receber
          </Button>
        </div>
      </form>
    </div>
  );
}
