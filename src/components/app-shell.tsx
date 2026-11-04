"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ClipboardList, House, LogOut, Users } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Início", icon: House },
  { href: "/plantel", label: "Plantel", icon: Users },
  { href: "/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/exercicios", label: "Exercícios", icon: BookOpen },
  { href: "/treinos", label: "Treinos", icon: ClipboardList },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* Desktop: barra lateral */}
      <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 hidden w-60 flex-col px-3 py-6 lg:flex">
        <Link
          href="/"
          className="mb-8 px-3 text-[22px] font-[650] tracking-tight [font-stretch:88%]"
        >
          Overlap
        </Link>
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
        <form action={signOut} className="mt-auto">
          <button
            type="submit"
            className="text-sidebar-foreground/70 flex h-11 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-5" strokeWidth={1.75} />
            Terminar sessão
          </button>
        </form>
      </aside>

      <main className="mx-auto w-full max-w-[720px] px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:px-8 lg:pt-10 lg:pb-12">
        {children}
      </main>

      {/* Mobile: barra inferior */}
      <nav
        aria-label="Principal"
        className="border-border bg-card fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
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
      </nav>
    </div>
  );
}
