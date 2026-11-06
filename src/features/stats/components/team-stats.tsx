import { SectionTitle } from "@/components/page-header";
import { Versus } from "@/features/matches/components/live/live-summary";
import type { Form, TeamSummary } from "../aggregate";

const FORM_STYLE: Record<Form, { className: string; label: string }> = {
  V: { className: "bg-result-win", label: "Vitória" },
  E: { className: "bg-result-draw", label: "Empate" },
  D: { className: "bg-result-loss", label: "Derrota" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

/** Resultados da equipa e médias por jogo (as médias só dos jogos registados ao vivo). */
export function TeamStats({ team, teamName }: { team: TeamSummary; teamName: string }) {
  const avg = team.averages;
  const extra = avg
    ? [
        { label: "Cantos", ...avg.corner },
        { label: "Faltas", ...avg.foul },
        { label: "Bolas perdidas", ...avg.turnover },
        { label: "Bolas recuperadas", ...avg.recovery },
      ].filter((r) => r.us + r.them > 0)
    : [];

  return (
    <section>
      <SectionTitle>Equipa</SectionTitle>
      {team.played === 0 ? (
        <p className="text-muted-foreground text-[15px]">Ainda não há jogos com resultado.</p>
      ) : (
        <dl className="border-border bg-card divide-border divide-y rounded-lg border">
          <Row label="Jogos">
            <span className="tabular-nums">{team.played}</span>
            <span className="text-muted-foreground ml-2 tabular-nums">
              {team.wins}V {team.draws}E {team.losses}D
            </span>
          </Row>
          <Row label="Golos">
            <span className="tabular-nums">
              {team.goalsFor}–{team.goalsAgainst}
            </span>
            <span className="text-muted-foreground ml-2">marcados–sofridos</span>
          </Row>
          <Row label={`Últimos ${team.form.length}`}>
            <span className="flex gap-1.5">
              {team.form.map((f, i) => (
                <span
                  key={i}
                  aria-label={FORM_STYLE[f].label}
                  className={`inline-flex size-6 items-center justify-center rounded-md text-xs font-bold text-white ${FORM_STYLE[f].className}`}
                >
                  {f}
                </span>
              ))}
            </span>
          </Row>
        </dl>
      )}

      {avg && (
        <div className="mt-4">
          <h3 className="text-muted-foreground mb-1.5 text-[13px] font-medium">
            Média por jogo · {team.liveGames} {team.liveGames === 1 ? "jogo" : "jogos"} registados
            ao vivo
          </h3>
          <div className="border-border bg-card divide-border divide-y rounded-lg border">
            <div className="text-muted-foreground flex justify-between px-4 pt-2.5 pb-1 text-[13px] font-medium">
              <span className="max-w-[40%] truncate">{teamName}</span>
              <span>Adversários</span>
            </div>
            <Versus label="Remates" us={avg.shots.us} them={avg.shots.them} digits={1} />
            <Versus label="À baliza" us={avg.onTarget.us} them={avg.onTarget.them} digits={1} />
            {extra.map((r) => (
              <Versus key={r.label} label={r.label} us={r.us} them={r.them} digits={1} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
