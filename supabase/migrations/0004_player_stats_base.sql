-- Estatísticas: valores de base por jogador (jogos, minutos, golos e assistências de antes da app).
-- Somam-se ao que vem dos jogos registados ao vivo. Uma coluna jsonb em `players` (validada em código
-- por `statsBaseSchema`), por isso a RLS e as políticas existentes de `players` já a cobrem.
alter table public.players
  add column stats_base jsonb
    check (stats_base is null or (jsonb_typeof(stats_base) = 'object' and pg_column_size(stats_base) <= 1000));
