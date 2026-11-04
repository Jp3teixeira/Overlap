import { AppShell } from "@/components/app-shell";

// F1.1: aqui entra a verificação de sessão (dentro de <Suspense>, por causa do cacheComponents).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
