import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Sem acesso" };

export default function NoAccessPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4">
      <h1 className="text-[26px] leading-[30px] font-[650] tracking-tight">
        Sem acesso a nenhuma equipa
      </h1>
      <p className="text-muted-foreground mt-2 text-[15px] leading-[22px]">
        A tua conta entrou, mas ainda não foi adicionada a uma equipa. Pede a quem gere o Overlap
        para te adicionar e volta a entrar.
      </p>
      <form action={signOut} className="mt-6">
        <Button type="submit" variant="outline" className="w-full">
          Terminar sessão
        </Button>
      </form>
    </main>
  );
}
