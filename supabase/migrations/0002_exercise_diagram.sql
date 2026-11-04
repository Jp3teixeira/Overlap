-- Biblioteca visual: campo desenhado + dados estruturados do exercício.
-- Só acrescenta colunas (nada é apagado). `max_players`, `organization` e
-- `coaching_points` deixam de ser usados pela app mas ficam na tabela.
-- A RLS da tabela `exercises` já cobre as colunas novas.

alter table public.exercises
  add column diagram          jsonb
    check (diagram is null or (jsonb_typeof(diagram) = 'object' and pg_column_size(diagram) <= 30000)),
  add column series           smallint check (series between 1 and 20),
  add column rest_seconds     smallint check (rest_seconds between 0 and 600),
  add column success_criteria text check (char_length(success_criteria) <= 1000);

comment on column public.exercises.diagram is
  'Desenho do campo: { v: 1, field, pieces[], arrows[], zones[] }. Validado em src/features/exercises/diagram.ts';
