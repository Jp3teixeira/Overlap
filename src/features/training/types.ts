import type { Diagram } from "@/features/exercises/diagram";
import type { ExerciseTag } from "@/features/exercises/labels";
import type { SessionStatus } from "./labels";

// Escritos à mão a partir da migração 0001 (training_sessions e training_session_exercises).

export type SessionListItem = {
  id: string;
  session_date: string;
  start_time: string | null;
  target_duration_min: number | null;
  objectives: string | null;
  status: SessionStatus;
  /** Soma dos minutos dos itens. */
  total_min: number;
  item_count: number;
};

export type SessionRow = {
  id: string;
  session_date: string;
  start_time: string | null;
  target_duration_min: number | null;
  objectives: string | null;
  expected_players: number | null;
  space: string | null;
  notes: string | null;
  post_notes: string | null;
  status: SessionStatus;
};

/** O que a ficha do treino precisa de saber do exercício da biblioteca. */
export type ItemExercise = {
  id: string;
  name: string;
  tags: ExerciseTag[];
  diagram: Diagram | null;
  equipment: string | null;
  is_archived: boolean;
};

export type SessionItemView = {
  id: string;
  position: number;
  duration_min: number;
  notes: string | null;
  /** Título livre quando não há exercício da biblioteca. */
  custom_title: string | null;
  exercise: ItemExercise | null;
};

export type SessionObservationItem = {
  id: string;
  body: string;
  authorName: string;
  playerId: string;
  playerName: string;
};
