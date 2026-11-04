"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import {
  applyTheme,
  NEXT_PREFERENCE,
  PREFERENCE_LABEL,
  readPreference,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICON = { auto: SunMoon, light: Sun, dark: Moon } as const;

function subscribe(onChange: () => void) {
  window.addEventListener("themechange", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("themechange", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Muda o tema em ciclo: Automático → Escuro → Claro. */
export function ThemeToggle({
  variant,
  className,
}: {
  variant: "icon" | "row";
  className?: string;
}) {
  const pref = useSyncExternalStore<ThemePreference>(subscribe, readPreference, () => "auto");
  const Icon = ICON[pref];
  const label = `Tema: ${PREFERENCE_LABEL[pref]}`;

  return (
    <button
      type="button"
      onClick={() => applyTheme(NEXT_PREFERENCE[pref])}
      aria-label={`${label}. Tocar para mudar.`}
      className={cn(
        variant === "icon"
          ? "text-muted-foreground hover:bg-muted flex size-11 items-center justify-center rounded-lg"
          : "text-sidebar-foreground/70 flex h-11 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium hover:bg-white/5 hover:text-white",
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
      {variant === "row" && label}
    </button>
  );
}
