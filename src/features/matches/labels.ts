// Têm de bater certo com os enums public.match_kind e public.match_venue (migração 0001).

export const MATCH_KINDS = ["oficial", "particular", "torneio"] as const;
export type MatchKind = (typeof MATCH_KINDS)[number];

export const KIND_LABEL: Record<MatchKind, string> = {
  oficial: "Oficial",
  particular: "Particular",
  torneio: "Torneio",
};

export const MATCH_VENUES = ["casa", "fora", "neutro"] as const;
export type MatchVenue = (typeof MATCH_VENUES)[number];

export const VENUE_LABEL: Record<MatchVenue, string> = {
  casa: "Casa",
  fora: "Fora",
  neutro: "Neutro",
};

export const kindOptions = MATCH_KINDS.map((value) => ({ value, label: KIND_LABEL[value] }));
export const venueOptions = MATCH_VENUES.map((value) => ({ value, label: VENUE_LABEL[value] }));
