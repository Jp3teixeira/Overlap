import { Suspense } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { OverlapMark } from "./overlap-mark";
import { ActiveNavLinks, NavLinks } from "./app-nav";

/** Estrutura da app: barra lateral no desktop, barra inferior no mobile. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:pl-60">
      {/* Desktop: barra lateral */}
      <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 hidden w-60 flex-col px-3 py-6 lg:flex">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2.5 px-3 text-[22px] font-[650] tracking-tight [font-stretch:88%]"
        >
          <OverlapMark className="h-5 w-8" />
          Overlap
        </Link>
        <Suspense fallback={<NavLinks variant="sidebar" pathname={null} />}>
          <ActiveNavLinks variant="sidebar" />
        </Suspense>
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
        <Suspense fallback={<NavLinks variant="bottom" pathname={null} />}>
          <ActiveNavLinks variant="bottom" />
        </Suspense>
      </nav>
    </div>
  );
}
