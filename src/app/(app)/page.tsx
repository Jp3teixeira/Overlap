import Link from "next/link";
import { CalendarDays, ClipboardList, MessageSquarePlus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";

// Início: próximo treino, próximo jogo, último resultado e 3 atalhos. Nada mais (F6.1).
export default function HomePage() {
  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-[26px] leading-[30px] font-[650] tracking-tight lg:hidden">Overlap</h1>
        <form action={signOut} className="lg:hidden">
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
            Sair
          </Button>
        </form>
        <h1 className="hidden text-[26px] leading-[30px] font-[650] tracking-tight lg:block">
          Início
        </h1>
      </header>

      <div className="flex flex-col gap-6">
        <section>
          <SectionTitle>Próximo treino</SectionTitle>
          <EmptyState message="Ainda não há treinos planeados. Planeia o próximo em Treinos." />
        </section>
        <section>
          <SectionTitle>Próximo jogo</SectionTitle>
          <EmptyState message="Ainda não há jogos. Adiciona o calendário da época em Jogos." />
        </section>

        <nav aria-label="Atalhos" className="grid grid-cols-3 gap-2">
          <Button asChild variant="outline" className="h-auto flex-col gap-1 py-3 text-sm">
            <Link href="/plantel">
              <MessageSquarePlus />
              Observação
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-1 py-3 text-sm">
            <Link href="/treinos">
              <ClipboardList />
              Treino
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-1 py-3 text-sm">
            <Link href="/jogos">
              <CalendarDays />
              Jogo
            </Link>
          </Button>
        </nav>
      </div>
    </>
  );
}
