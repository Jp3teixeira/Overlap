import type { PlayerPosition } from "@/features/players/labels";

/** O mínimo de um jogador para o jogo ao vivo. */
export type LivePlayer = {
  id: string;
  name: string;
  shirt_number: number | null;
  positions: PlayerPosition[];
  is_active: boolean;
  /** URL assinado (1 h) da foto; sem foto, usa-se o número. */
  photo_url?: string | null;
};

export type PlayerMap = ReadonlyMap<string, LivePlayer>;

export function toPlayerMap(players: LivePlayer[]): PlayerMap {
  return new Map(players.map((p) => [p.id, p]));
}

export function playerName(map: PlayerMap, id: string | null | undefined): string {
  return (id && map.get(id)?.name) || "Jogador";
}
