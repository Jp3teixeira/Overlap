import { SectionTitle } from "@/components/page-header";
import { cn } from "@/lib/utils";
import {
  convocados,
  elapsedSeconds,
  formatClock,
  goals,
  minutesLabel,
  playerSeconds,
  playerStats,
  score,
  teamStats,
  type LiveState,
  type PlayerStatLine,
} from "../../live";
import { playerName, type PlayerMap } from "./types";

/** Um valor de cada equipa com uma barra repartida (quem teve mais, de relance). */
export function Versus({
  label,
  us,
  them,
  digits = 0,
}: {
  label: string;
  us: number;
  them: number;
  /** Casas decimais (médias). */
  digits?: number;
}) {
  const total = us + them;
  const usShare = total === 0 ? 0 : (us / total) * 100;
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-baseline justify-between text-[15px]">
        <span className="w-10 text-lg font-[650] [font-stretch:88%] tabular-nums">
          {us.toFixed(digits)}
        </span>
        <span className="text-muted-foreground">{label}</span>
        <span className="w-10 text-right text-lg font-[650] [font-stretch:88%] tabular-nums">
          {them.toFixed(digits)}
        </span>
      </div>
      <div
        className={cn(
          "mt-1.5 flex h-1.5 overflow-hidden rounded-full",
          total === 0 ? "bg-muted" : "bg-muted-foreground/35",
        )}
      >
        {total > 0 && <span className="bg-primary" style={{ width: `${usShare}%` }} />}
      </div>
    </div>
  );
}

/** Estatísticas da equipa estilo Flashscore: um valor de cada lado e uma barra. */
export function TeamStatsTable({
  live,
  teamName,
  opponent,
}: {
  live: LiveState;
  teamName: string;
  opponent: string;
}) {
  const stats = teamStats(live);
  const result = score(live);
  return (
    <div className="border-border bg-card divide-border divide-y rounded-lg border">
      <div className="text-muted-foreground flex justify-between px-4 pt-2.5 pb-1 text-[13px] font-medium">
        <span className="max-w-[40%] truncate">{teamName}</span>
        <span className="max-w-[40%] truncate">{opponent}</span>
      </div>
      <Versus label="Golos" us={result.us} them={result.them} />
      <Versus label="Remates" us={stats.shots.us} them={stats.shots.them} />
      <Versus label="À baliza" us={stats.onTarget.us} them={stats.onTarget.them} />
      <Versus
        label="Remates fora"
        us={stats.shots.us - stats.onTarget.us}
        them={stats.shots.them - stats.onTarget.them}
      />
      <Versus label="Cantos" us={stats.corner.us} them={stats.corner.them} />
      <Versus label="Faltas" us={stats.foul.us} them={stats.foul.them} />
      <Versus label="Bolas perdidas" us={stats.turnover.us} them={stats.turnover.them} />
      <Versus label="Bolas recuperadas" us={stats.recovery.us} them={stats.recovery.them} />
    </div>
  );
}

/** "1 golo · 3 remates (2 à baliza) · 4 recuperadas": só o que não é zero. */
export function playerStatText(l: PlayerStatLine): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts: string[] = [];
  if (l.goals) parts.push(plural(l.goals, "golo", "golos"));
  if (l.assists) parts.push(plural(l.assists, "assistência", "assistências"));
  if (l.shots)
    parts.push(
      `${plural(l.shots, "remate", "remates")}${l.onTarget ? ` (${l.onTarget} à baliza)` : ""}`,
    );
  if (l.recovery) parts.push(plural(l.recovery, "recuperada", "recuperadas"));
  if (l.turnover) parts.push(plural(l.turnover, "perdida", "perdidas"));
  if (l.corner) parts.push(plural(l.corner, "canto", "cantos"));
  if (l.foul) parts.push(plural(l.foul, "falta", "faltas"));
  return parts.join(" · ");
}

/**
 * Resumo de um jogo registado ao vivo: golos, estatísticas e minutos por jogador.
 * Sem hooks, serve tanto no servidor (ficha do jogo) como no cliente (fim do jogo).
 */
export function LiveSummary({
  live,
  players,
  teamName,
  opponent,
  wide = false,
}: {
  live: LiveState;
  players: PlayerMap;
  teamName: string;
  opponent: string;
  /** No PC e numa página larga: golos e estatísticas de um lado, jogadores do outro. */
  wide?: boolean;
}) {
  const lines = playerStats(live);
  const gameSeconds = elapsedSeconds(live, 0);
  const seconds = playerSeconds(live, 0);
  const ranked = convocados(live)
    .map((id) => ({ id, s: seconds[id] ?? 0 }))
    .sort(
      (a, b) =>
        b.s - a.s || playerName(players, a.id).localeCompare(playerName(players, b.id), "pt"),
    );
  const total = ranked.reduce((sum, r) => sum + r.s, 0);
  const sumOk = Math.abs(total - 7 * gameSeconds) < 2;
  const edited = Object.keys(live.secondsOverride).length > 0;
  const goalList = goals(live);
  const statText = Object.fromEntries(
    Object.entries(lines).map(([id, l]) => [id, playerStatText(l)]),
  );

  return (
    <div
      className={cn(
        "space-y-6",
        wide && "lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0",
      )}
    >
      <div className="space-y-6">
        <section>
          <SectionTitle>Golos</SectionTitle>
          {goalList.length === 0 ? (
            <p className="text-muted-foreground text-[15px]">Sem golos registados.</p>
          ) : (
            <ul className="border-border bg-card divide-border divide-y rounded-lg border">
              {goalList.map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-4 py-2.5 text-[15px]">
                  <span className="text-muted-foreground w-9 tabular-nums">
                    {minutesLabel(g.t)}
                  </span>
                  <span className="font-medium">
                    {g.side === "us" ? playerName(players, g.playerId) : `Golo do ${opponent}`}
                  </span>
                  {g.side === "us" && !g.playerId && (
                    <span className="text-muted-foreground">(sem marcador)</span>
                  )}
                  {g.assistId && (
                    <span className="text-muted-foreground">
                      · ass. {playerName(players, g.assistId)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>Estatísticas</SectionTitle>
          <TeamStatsTable live={live} teamName={teamName} opponent={opponent} />
        </section>
      </div>

      <section>
        <SectionTitle>Jogadores</SectionTitle>
        <ul className="border-border bg-card divide-border divide-y rounded-lg border">
          {ranked.map(({ id, s }) => {
            const share = gameSeconds > 0 ? Math.min(100, (s / gameSeconds) * 100) : 0;
            const low = gameSeconds > 0 && s < gameSeconds * 0.4;
            return (
              <li key={id} className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="bg-secondary text-secondary-foreground grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold [font-stretch:88%] tabular-nums">
                    {players.get(id)?.shirt_number ?? "–"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                    {playerName(players, id)}
                  </span>
                  {low && <span className="text-muted-foreground text-[12px]">poucos minutos</span>}
                  <span className="w-10 text-right text-[15px] font-semibold tabular-nums">
                    {minutesLabel(s)}
                  </span>
                </div>
                {statText[id] && (
                  <p className="text-muted-foreground mt-1 pl-11 text-[13px] leading-4">
                    {statText[id]}
                  </p>
                )}
                <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                  <span
                    className="bg-primary block h-full rounded-full"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground mt-2 text-[13px]">
          Tempo de jogo {formatClock(gameSeconds)}.{" "}
          {edited
            ? "Minutos corrigidos à mão."
            : sumOk
              ? "A soma dos minutos bate certo (7 jogadores em campo o tempo todo)."
              : "A soma dos minutos não bate certo com 7 em campo: confirma as substituições."}
        </p>
      </section>
    </div>
  );
}
