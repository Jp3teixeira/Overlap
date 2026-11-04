import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import type { MatchObservationItem } from "../types";

/** Observações feitas neste jogo (só leitura; edita-se na ficha do jogador). */
export function MatchObservations({ items }: { items: MatchObservationItem[] }) {
  if (items.length === 0) {
    return <EmptyState message="Ainda não há observações deste jogo. Regista a primeira." />;
  }
  return (
    <ol className="divide-border border-border bg-card divide-y overflow-hidden rounded-lg border">
      {items.map((o) => (
        <li key={o.id} className="px-4 py-3">
          <p className="text-muted-foreground flex items-center gap-1.5 text-[13px] leading-[18px]">
            <Link href={`/plantel/${o.playerId}`} className="text-primary font-medium">
              {o.playerName}
            </Link>
            <span aria-hidden>·</span>
            <span>{o.authorName}</span>
          </p>
          <p className="mt-1 text-[15px] leading-[22px] whitespace-pre-wrap">{o.body}</p>
        </li>
      ))}
    </ol>
  );
}
