import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ClipboardList, MessageSquarePlus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { ObservationButton } from "@/features/observations/components/observation-button";
import { getTodayContext } from "@/features/observations/queries";
import { listPlayerOptions } from "@/features/players/queries";
import { getCurrentTeam } from "@/lib/team";

const tile = "h-auto flex-col gap-1 py-3 text-sm";

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
          <Suspense
            fallback={
              <Button variant="outline" className={tile} disabled>
                <MessageSquarePlus />
                Observação
              </Button>
            }
          >
            <ObservationShortcut />
          </Suspense>
          <Button asChild variant="outline" className={tile}>
            <Link href="/treinos">
              <ClipboardList />
              Treino
            </Link>
          </Button>
          <Button asChild variant="outline" className={tile}>
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

/** Atalho de observação: precisa do plantel e do contexto de hoje, por isso vive no <Suspense>. */
async function ObservationShortcut() {
  const [team, players, context] = await Promise.all([
    getCurrentTeam(),
    listPlayerOptions(),
    getTodayContext(),
  ]);
  if (!team.canEdit) {
    return (
      <Button asChild variant="outline" className={tile}>
        <Link href="/plantel">
          <MessageSquarePlus />
          Plantel
        </Link>
      </Button>
    );
  }
  return (
    <ObservationButton players={players} context={context} variant="outline" className={tile}>
      <MessageSquarePlus />
      Observação
    </ObservationButton>
  );
}
