export type ObservationItem = {
  id: string;
  body: string;
  observed_on: string;
  authorName: string;
  /** "no treino", "vs FC Infesta" ou null. */
  context: string | null;
  isMine: boolean;
};

/** Treino e/ou jogo de hoje, para ligar a observação automaticamente. */
export type TodayContext = {
  sessionId: string | null;
  match: { id: string; opponent: string } | null;
};
