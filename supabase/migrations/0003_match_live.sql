-- Jogo ao vivo: convocatória, onze inicial, substituições, cronómetro e contagens do jogo.
-- Uma coluna jsonb em `matches` (validada em código por `liveSchema`), como o `diagram` dos exercícios.
-- Sem tabelas novas, por isso a RLS e as políticas existentes de `matches` já a cobrem.
alter table public.matches
  add column live jsonb
    check (live is null or (jsonb_typeof(live) = 'object' and pg_column_size(live) <= 100000));
