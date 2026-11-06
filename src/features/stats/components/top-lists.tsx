import { SectionTitle } from "@/components/page-header";
import { PlayerAvatar } from "@/components/player-avatar";
import type { PlayerLine, StatsPlayer } from "../aggregate";

type Ranked = { player: StatsPlayer; value: number };

function top(
  players: StatsPlayer[],
  lines: Map<string, PlayerLine>,
  pick: (l: PlayerLine) => number,
): Ranked[] {
  return players
    .map((player) => ({ player, value: pick(lines.get(player.id)!) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.player.name.localeCompare(b.player.name, "pt"))
    .slice(0, 5);
}

function Ranking({ title, rows, empty }: { title: string; rows: Ranked[]; empty: string }) {
  return (
    <div>
      <h3 className="text-muted-foreground mb-1.5 text-[13px] font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-[15px]">{empty}</p>
      ) : (
        <ol className="border-border bg-card divide-border divide-y rounded-lg border">
          {rows.map(({ player, value }, i) => (
            <li key={player.id} className="flex items-center gap-3 px-4 py-2">
              <span className="text-muted-foreground w-4 text-[15px] tabular-nums">{i + 1}</span>
              <PlayerAvatar
                name={player.name}
                shirtNumber={player.shirt_number}
                photoUrl={player.photo_url}
              />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{player.name}</span>
              <span className="text-lg font-[650] [font-stretch:88%] tabular-nums">{value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Quem mais marcou e quem mais assistiu (top 5 de cada). */
export function TopLists({ players, lines }: { players: StatsPlayer[]; lines: PlayerLine[] }) {
  const byId = new Map(lines.map((l) => [l.id, l]));
  return (
    <section className="space-y-4">
      <SectionTitle>Destaques</SectionTitle>
      <Ranking
        title="Marcadores"
        rows={top(players, byId, (l) => l.goals)}
        empty="Ainda sem golos de jogadores."
      />
      <Ranking
        title="Assistências"
        rows={top(players, byId, (l) => l.assists)}
        empty="Ainda sem assistências."
      />
    </section>
  );
}
