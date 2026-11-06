"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlayerAvatar } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runAction } from "@/lib/run-action";
import { saveStatsBase } from "../actions";
import type { StatsBase } from "../schemas";

export type BaseRow = {
  id: string;
  name: string;
  shirtNumber: number | null;
  photoUrl: string | null;
  base: StatsBase;
};

type Field = keyof StatsBase;
type Draft = Record<Field, string>;

const FIELDS: { key: Field; label: string; max: number }[] = [
  { key: "games", label: "Jogos", max: 3 },
  { key: "minutes", label: "Minutos", max: 5 },
  { key: "goals", label: "Golos", max: 3 },
  { key: "assists", label: "Assist.", max: 3 },
];

const toDraft = (b: StatsBase): Draft => ({
  games: b.games ? String(b.games) : "",
  minutes: b.minutes ? String(b.minutes) : "",
  goals: b.goals ? String(b.goals) : "",
  assists: b.assists ? String(b.assists) : "",
});

/** Um jogador por linha, 4 números. Vazio = 0. Guarda todos de uma vez. */
export function BaseForm({ rows }: { rows: BaseRow[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, toDraft(r.base)])),
  );
  const [saving, setSaving] = useState(false);

  function set(id: string, key: Field, raw: string, max: number) {
    const digits = raw.replace(/\D/g, "").slice(0, max);
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: digits } }));
  }

  async function onSave() {
    setSaving(true);
    const result = await runAction(() =>
      saveStatsBase({
        players: rows.map((r) => {
          const d = drafts[r.id];
          return {
            player_id: r.id,
            games: Number(d.games || 0),
            minutes: Number(d.minutes || 0),
            goals: Number(d.goals || 0),
            assists: Number(d.assists || 0),
          };
        }),
      }),
    );
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Valores de base guardados.");
    router.push("/estatisticas");
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-[15px] leading-[22px]">
        O que cada jogador já tinha antes de a app contar: jogos, minutos, golos e assistências.
        Soma-se ao que vem dos jogos registados ao vivo. Deixa vazio o que não sabes.
      </p>

      <ul className="border-border bg-card divide-border divide-y rounded-lg border">
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-3">
            <div className="mb-2 flex items-center gap-2.5">
              <PlayerAvatar name={r.name} shirtNumber={r.shirtNumber} photoUrl={r.photoUrl} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{r.name}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-muted-foreground mb-1 block text-[12px] leading-4">
                    {f.label}
                  </span>
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    placeholder="0"
                    value={drafts[r.id][f.key]}
                    onChange={(e) => set(r.id, f.key, e.target.value, f.max)}
                    className="px-1 text-center tabular-nums"
                  />
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <Button size="lg" className="w-full" onClick={onSave} disabled={saving}>
        {saving ? "A guardar…" : "Guardar"}
      </Button>
    </div>
  );
}
