import type { MatchKind, MatchVenue } from "./labels";

// Escritos à mão a partir da migração 0001 (tabela public.matches).

export type MatchListItem = {
  id: string;
  match_date: string;
  kickoff_time: string | null;
  opponent: string;
  kind: MatchKind;
  competition: string | null;
  venue: MatchVenue;
  goals_for: number | null;
  goals_against: number | null;
};

export type MatchRow = MatchListItem & {
  went_well: string | null;
  went_badly: string | null;
  to_work_on: string | null;
  notes: string | null;
  zerozero_url: string | null;
  video_url: string | null;
};

/** Observação feita num jogo, com o jogador a que se refere. */
export type MatchObservationItem = {
  id: string;
  body: string;
  authorName: string;
  playerId: string;
  playerName: string;
};
