import type { DominantFoot, PlayerPosition } from "./labels";

// Escritos à mão a partir da migração 0001. Depois de `npm run db:types`,
// podem passar a derivar de Database["public"]["Tables"]["players"]["Row"].

export type PlayerRow = {
  id: string;
  team_id: string;
  name: string;
  shirt_number: number | null;
  birth_year: number | null;
  positions: PlayerPosition[];
  dominant_foot: DominantFoot | null;
  current_focus: string | null;
  photo_path: string | null;
  /** URL assinado (1 h) da foto, gerado no servidor. Nulo sem foto. */
  photo_url: string | null;
  is_active: boolean;
};

export type PlayerListItem = Pick<
  PlayerRow,
  "id" | "name" | "shirt_number" | "positions" | "is_active" | "photo_url"
>;

/** O mínimo para escolher um jogador (ex.: observação rápida). */
export type PlayerOption = Pick<PlayerRow, "id" | "name" | "shirt_number">;
