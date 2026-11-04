import { POSITION_GROUPS, primaryGroup, type PlayerPosition } from "./labels";

type Groupable = {
  name: string;
  shirt_number: number | null;
  positions: readonly PlayerPosition[];
};

export type PlayerGroup<T> = { key: string; label: string; players: T[] };

/** Por número da camisola (sem número no fim) e depois por nome. */
function byNumberThenName(a: Groupable, b: Groupable) {
  if (a.shirt_number !== b.shirt_number) {
    if (a.shirt_number === null) return 1;
    if (b.shirt_number === null) return -1;
    return a.shirt_number - b.shirt_number;
  }
  return a.name.localeCompare(b.name, "pt");
}

/**
 * Plantel por posição: GR → defesas → médios → avançados, e no fim os sem posição.
 * Cada jogador fica no grupo da sua posição principal (a primeira escolhida).
 * Grupos vazios não aparecem.
 */
export function groupPlayers<T extends Groupable>(players: T[]): PlayerGroup<T>[] {
  const groups: PlayerGroup<T>[] = POSITION_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    players: players.filter((p) => primaryGroup(p.positions) === g.key).sort(byNumberThenName),
  }));
  groups.push({
    key: "sem-posicao",
    label: "Sem posição definida",
    players: players.filter((p) => primaryGroup(p.positions) === null).sort(byNumberThenName),
  });
  return groups.filter((g) => g.players.length > 0);
}

/** A mesma ordem, numa só lista (para escolher jogadores). */
export function sortPlayersByPosition<T extends Groupable>(players: T[]): T[] {
  return groupPlayers(players).flatMap((g) => g.players);
}
