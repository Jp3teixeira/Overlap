// Tem de bater certo com o enum public.session_status (migração 0001).

export const SESSION_STATUSES = ["planeado", "realizado", "cancelado"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const STATUS_LABEL: Record<SessionStatus, string> = {
  planeado: "Planeado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

/** Duração alvo sugerida para um treino novo. */
export const DEFAULT_TARGET_MIN = 60;
