import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <h1 className="text-[34px] leading-[38px] font-[650] tracking-tight">Overlap</h1>
      <p className="text-muted-foreground mt-1 mb-8 text-[15px]">Equipa técnica do Candal Sub-11</p>
      <LoginForm />
      <p className="text-muted-foreground mt-8 text-[13px] leading-[18px]">
        As contas são criadas por quem gere o Overlap. Se te esqueceste da password, fala com ele.
      </p>
    </main>
  );
}
