"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ClipboardList, House, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Início", icon: House },
  { href: "/plantel", label: "Plantel", icon: Users },
  { href: "/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/exercicios", label: "Exercícios", icon: BookOpen },
  { href: "/treinos", label: "Treinos", icon: ClipboardList },
] as const;

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

type Variant = "sidebar" | "bottom";

/** Links da navegação. Sem pathname (enquanto carrega) nenhum aparece ativo. */
export function NavLinks({ variant, pathname }: { variant: Variant; pathname: string | null }) {
  if (variant === "sidebar") {
    return (
      <nav aria-label="Principal" className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <ul className="grid grid-cols-5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-[22px]" strokeWidth={active ? 2.1 : 1.75} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Versão com o separador ativo. Lê o URL, por isso vive dentro de <Suspense> (cacheComponents). */
export function ActiveNavLinks({ variant }: { variant: Variant }) {
  const pathname = usePathname();
  return <NavLinks variant={variant} pathname={pathname} />;
}
