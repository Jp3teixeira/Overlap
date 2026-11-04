"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type ResponsiveSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Botões fixos em baixo (ex.: Guardar). */
  footer?: React.ReactNode;
};

/**
 * Pop-up centrado, no telemóvel e no computador. Todos os formulários abrem aqui.
 *
 * Porquê centrado e não uma gaveta de baixo: no iPhone a gaveta abria o teclado sozinha
 * e arrastar para ver o resto fechava-a. Aqui nada é focado ao abrir (o teclado só aparece
 * quando tocas num campo) e, com o teclado aberto, o pop-up sobe e encolhe para não ficar tapado.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ResponsiveSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        // Em vez de focar o primeiro campo (abre o teclado), foca o próprio pop-up.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          contentRef.current?.focus();
        }}
        className="flex flex-col gap-0 overflow-hidden p-0 max-lg:has-[input:focus,textarea:focus]:top-3 max-lg:has-[input:focus,textarea:focus]:max-h-[52dvh] max-lg:has-[input:focus,textarea:focus]:translate-y-0"
      >
        <div className="px-6 pt-6 pb-3">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-1">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">{children}</div>
        {footer && (
          <div className="border-border flex flex-col gap-2 border-t px-6 pt-3 pb-4">{footer}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
