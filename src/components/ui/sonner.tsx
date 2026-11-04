"use client";

import { Toaster as Sonner } from "sonner";

function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-card !text-foreground !shadow-lg !font-sans !text-[15px]",
          description: "!text-muted-foreground",
          error: "!border-destructive/40",
        },
      }}
    />
  );
}

export { Toaster };
