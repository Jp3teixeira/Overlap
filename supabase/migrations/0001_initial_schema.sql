-- =============================================================================
-- Overlap — 0001_initial_schema.sql
-- Schema completo do MVP: equipa, plantel, observações, exercícios, treinos, jogos.
--
-- Regras de segurança (ver docs/DATABASE.md):
--   * RLS ativa em TODAS as tabelas. Sem política = sem acesso.
--   * Ler: membros da equipa.  Escrever: membros com papel 'owner' ou 'coach'.
--   * 'staff' (ex.: Sr. Fernando, no futuro) fica só com leitura.
--   * Todas as tabelas de dados têm team_id. As tabelas filhas usam FKs compostas
--     (id, team_id) para garantir que o team_id da filha = team_id do pai.
--   * Ficheiros: bucket privado 'team-media', caminho '{team_id}/...'.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tipos
-- -----------------------------------------------------------------------------
create type public.team_role as enum ('owner', 'coach', 'staff');

create type public.player_position as enum (
  'gr', 'defesa', 'lateral', 'medio', 'extremo', 'avancado'
);

create type public.dominant_foot as enum ('direito', 'esquerdo', 'ambos');

-- Lista fixa de etiquetas de exercícios. Acrescentar uma nova:
--   alter type public.exercise_tag add value 'nova_etiqueta';
create type public.exercise_tag as enum (
  'aquecimento',
  'guarda_redes',
  'passe_rececao',
  'conducao',
  'finalizacao',
  'duelo_1x1',
  'superioridade_inferioridade',
  'posse',
  'transicoes',
  'org_defensiva',
  'org_ofensiva',
  'bolas_paradas',
  'jogo_reduzido'
);

create type public.session_status as enum ('planeado', 'realizado', 'cancelado');
create type public.match_kind     as enum ('oficial', 'particular', 'torneio');
create type public.match_venue    as enum ('casa', 'fora', 'neutro');


-- -----------------------------------------------------------------------------
-- 2. Utilitários
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Extrai o team_id do primeiro segmento de um caminho de Storage.
-- Devolve null (=> acesso negado) se o caminho não começar por um uuid.
create or replace function public.storage_path_team_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_name, '/', 1)::uuid
  end;
$$;


-- -----------------------------------------------------------------------------
-- 3. Equipa e membros
-- -----------------------------------------------------------------------------
-- "Equipa" = espaço de trabalho da equipa técnica. Persiste entre épocas.
-- A época deriva da data (jul–jun); não há tabela de épocas no MVP.
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  created_at  timestamptz not null default now()
);

-- Gerida só pelo dashboard/SQL (sem escrita pela app).
create table public.team_members (
  team_id       uuid not null references public.teams (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          public.team_role not null default 'coach',
  display_name  text not null check (char_length(display_name) between 1 and 40),
  created_at    timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_members_user_id_idx on public.team_members (user_id);

-- Funções de autorização usadas nas políticas.
-- security definer: leem team_members sem disparar a RLS dessa tabela (evita recursão).
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_edit_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = (select auth.uid())
      and tm.role in ('owner', 'coach')
  );
$$;


-- -----------------------------------------------------------------------------
-- 4. Plantel
-- -----------------------------------------------------------------------------
create table public.players (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 60),  -- nome como é chamado
  shirt_number   smallint check (shirt_number between 1 and 99),
  birth_year     smallint check (birth_year between 2000 and 2100),        -- só o ano
  positions      public.player_position[] not null default '{}',
  dominant_foot  public.dominant_foot,
  current_focus  text check (char_length(current_focus) <= 200),           -- "foco atual"
  photo_path     text,
  is_active      boolean not null default true,                            -- arquivar, não apagar
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, team_id),
  check (photo_path is null or public.storage_path_team_id(photo_path) = team_id)
);

create index players_team_active_idx on public.players (team_id, is_active, name);


-- -----------------------------------------------------------------------------
-- 5. Biblioteca de exercícios
-- -----------------------------------------------------------------------------
create table public.exercises (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid not null references public.teams (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  tags             public.exercise_tag[] not null check (cardinality(tags) >= 1),
  description      text check (char_length(description) <= 2000),
  objectives       text check (char_length(objectives) <= 1000),
  min_players      smallint check (min_players between 1 and 40),
  max_players      smallint check (max_players between 1 and 40),
  duration_min     smallint check (duration_min between 1 and 120),
  space            text check (char_length(space) <= 80),           -- ex.: "20x15 m"
  equipment        text check (char_length(equipment) <= 300),
  organization     text check (char_length(organization) <= 2000),
  rules            text check (char_length(rules) <= 2000),
  variants         text check (char_length(variants) <= 2000),
  coaching_points  text check (char_length(coaching_points) <= 2000),
  image_path       text,
  is_archived      boolean not null default false,                  -- arquivar, não apagar
  created_by       uuid default auth.uid() references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, team_id),
  check (min_players is null or max_players is null or min_players <= max_players),
  check (image_path is null or public.storage_path_team_id(image_path) = team_id)
);

create index exercises_team_idx on public.exercises (team_id, is_archived, name);
create index exercises_tags_idx on public.exercises using gin (tags);


-- -----------------------------------------------------------------------------
-- 6. Treinos
-- -----------------------------------------------------------------------------
create table public.training_sessions (
  id                   uuid primary key default gen_random_uuid(),
  team_id              uuid not null references public.teams (id) on delete cascade,
  session_date         date not null,
  start_time           time,
  target_duration_min  smallint check (target_duration_min between 1 and 240),
  objectives           text check (char_length(objectives) <= 500),
  expected_players     smallint check (expected_players between 1 and 40),
  space                text check (char_length(space) <= 80),
  notes                text check (char_length(notes) <= 2000),       -- antes do treino
  post_notes           text check (char_length(post_notes) <= 2000),  -- o que aconteceu
  status               public.session_status not null default 'planeado',
  created_by           uuid default auth.uid() references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, team_id)
);

create index training_sessions_team_date_idx on public.training_sessions (team_id, session_date desc);

-- Itens de um treino. Duração e notas vivem AQUI (não no exercício), para que
-- editar um exercício da biblioteca não reescreva treinos passados.
-- Item livre (ex.: "Jogo final") = exercise_id null + custom_title.
create table public.training_session_exercises (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null,
  session_id    uuid not null,
  exercise_id   uuid,
  custom_title  text check (char_length(custom_title) between 1 and 80),
  position      smallint not null check (position >= 0),
  duration_min  smallint not null check (duration_min between 1 and 120),
  notes         text check (char_length(notes) <= 500),
  created_at    timestamptz not null default now(),
  foreign key (session_id, team_id)
    references public.training_sessions (id, team_id) on delete cascade,
  -- Impede apagar um exercício usado em treinos (arquiva-se em vez disso).
  -- deferrable: verificado no fim da transação, para que apagar a equipa inteira
  -- (cascade para exercícios E treinos ao mesmo tempo) não falhe.
  constraint tse_exercise_fk foreign key (exercise_id, team_id)
    references public.exercises (id, team_id)
    deferrable initially deferred,
  check (exercise_id is not null or custom_title is not null)
);

create index tse_session_position_idx on public.training_session_exercises (session_id, position);
create index tse_exercise_idx on public.training_session_exercises (exercise_id);

-- Reordena os itens de um treino numa só chamada (lista de ids pela nova ordem).
-- security invoker: a RLS aplica-se normalmente.
create or replace function public.reorder_session_items(p_session_id uuid, p_item_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.training_session_exercises t
  set position = (x.ord - 1)::smallint
  from unnest(p_item_ids) with ordinality as x(item_id, ord)
  where t.id = x.item_id
    and t.session_id = p_session_id;
end;
$$;


-- -----------------------------------------------------------------------------
-- 7. Jogos
-- -----------------------------------------------------------------------------
create table public.matches (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams (id) on delete cascade,
  match_date     date not null,
  kickoff_time   time,
  opponent       text not null check (char_length(opponent) between 1 and 80),
  kind           public.match_kind not null default 'oficial',
  competition    text check (char_length(competition) <= 80),
  venue          public.match_venue not null default 'casa',
  goals_for      smallint check (goals_for between 0 and 99),       -- null = ainda não jogado
  goals_against  smallint check (goals_against between 0 and 99),
  went_well      text check (char_length(went_well) <= 2000),
  went_badly     text check (char_length(went_badly) <= 2000),
  to_work_on     text check (char_length(to_work_on) <= 2000),
  notes          text check (char_length(notes) <= 2000),
  zerozero_url   text check (zerozero_url ~ '^https://'),
  video_url      text check (video_url ~ '^https://'),
  created_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, team_id),
  check ((goals_for is null) = (goals_against is null))
);

create index matches_team_date_idx on public.matches (team_id, match_date desc);


-- -----------------------------------------------------------------------------
-- 8. Observações de jogadores
-- -----------------------------------------------------------------------------
-- Ligação opcional ao treino ou jogo onde a observação foi feita.
-- Se o treino/jogo for apagado, a observação fica (só perde a ligação).
create table public.player_observations (
  id                   uuid primary key default gen_random_uuid(),
  team_id              uuid not null,
  player_id            uuid not null,
  author_id            uuid default auth.uid() references auth.users (id) on delete set null,
  body                 text not null check (char_length(body) between 1 and 2000),
  observed_on          date not null default current_date,
  training_session_id  uuid,
  match_id             uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  foreign key (player_id, team_id)
    references public.players (id, team_id) on delete cascade,
  foreign key (training_session_id, team_id)
    references public.training_sessions (id, team_id) on delete set null (training_session_id),
  foreign key (match_id, team_id)
    references public.matches (id, team_id) on delete set null (match_id)
);

create index player_observations_player_idx  on public.player_observations (player_id, observed_on desc);
create index player_observations_team_idx    on public.player_observations (team_id, observed_on desc);
create index player_observations_session_idx on public.player_observations (training_session_id);
create index player_observations_match_idx   on public.player_observations (match_id);


-- -----------------------------------------------------------------------------
-- 9. updated_at automático
-- -----------------------------------------------------------------------------
create trigger players_updated_at before update on public.players
  for each row execute function public.set_updated_at();
create trigger exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger training_sessions_updated_at before update on public.training_sessions
  for each row execute function public.set_updated_at();
create trigger matches_updated_at before update on public.matches
  for each row execute function public.set_updated_at();
create trigger player_observations_updated_at before update on public.player_observations
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 10. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.teams                      enable row level security;
alter table public.team_members               enable row level security;
alter table public.players                    enable row level security;
alter table public.exercises                  enable row level security;
alter table public.training_sessions          enable row level security;
alter table public.training_session_exercises enable row level security;
alter table public.matches                    enable row level security;
alter table public.player_observations        enable row level security;

-- teams / team_members: só leitura para membros. Escrita só pelo dashboard.
create policy teams_select on public.teams
  for select to authenticated using (public.is_team_member(id));

create policy team_members_select on public.team_members
  for select to authenticated using (public.is_team_member(team_id));

-- players
create policy players_select on public.players
  for select to authenticated using (public.is_team_member(team_id));
create policy players_insert on public.players
  for insert to authenticated with check (public.can_edit_team(team_id));
create policy players_update on public.players
  for update to authenticated
  using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id));
create policy players_delete on public.players
  for delete to authenticated using (public.can_edit_team(team_id));

-- exercises
create policy exercises_select on public.exercises
  for select to authenticated using (public.is_team_member(team_id));
create policy exercises_insert on public.exercises
  for insert to authenticated with check (public.can_edit_team(team_id));
create policy exercises_update on public.exercises
  for update to authenticated
  using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id));
create policy exercises_delete on public.exercises
  for delete to authenticated using (public.can_edit_team(team_id));

-- training_sessions
create policy training_sessions_select on public.training_sessions
  for select to authenticated using (public.is_team_member(team_id));
create policy training_sessions_insert on public.training_sessions
  for insert to authenticated with check (public.can_edit_team(team_id));
create policy training_sessions_update on public.training_sessions
  for update to authenticated
  using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id));
create policy training_sessions_delete on public.training_sessions
  for delete to authenticated using (public.can_edit_team(team_id));

-- training_session_exercises
create policy tse_select on public.training_session_exercises
  for select to authenticated using (public.is_team_member(team_id));
create policy tse_insert on public.training_session_exercises
  for insert to authenticated with check (public.can_edit_team(team_id));
create policy tse_update on public.training_session_exercises
  for update to authenticated
  using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id));
create policy tse_delete on public.training_session_exercises
  for delete to authenticated using (public.can_edit_team(team_id));

-- matches
create policy matches_select on public.matches
  for select to authenticated using (public.is_team_member(team_id));
create policy matches_insert on public.matches
  for insert to authenticated with check (public.can_edit_team(team_id));
create policy matches_update on public.matches
  for update to authenticated
  using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id));
create policy matches_delete on public.matches
  for delete to authenticated using (public.can_edit_team(team_id));

-- player_observations: o autor tem de ser quem está autenticado.
create policy player_observations_select on public.player_observations
  for select to authenticated using (public.is_team_member(team_id));
create policy player_observations_insert on public.player_observations
  for insert to authenticated
  with check (public.can_edit_team(team_id) and author_id = (select auth.uid()));
create policy player_observations_update on public.player_observations
  for update to authenticated
  using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id));
create policy player_observations_delete on public.player_observations
  for delete to authenticated using (public.can_edit_team(team_id));


-- -----------------------------------------------------------------------------
-- 11. Permissões (defesa em profundidade: anon não toca em nada)
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- Tabelas criadas no futuro (pelo SQL Editor / migrações) também nascem sem acesso anon.
alter default privileges for role postgres in schema public revoke all on tables from anon;

revoke execute on function public.is_team_member(uuid)                from public, anon;
revoke execute on function public.can_edit_team(uuid)                 from public, anon;
revoke execute on function public.reorder_session_items(uuid, uuid[]) from public, anon;
grant  execute on function public.is_team_member(uuid)                to authenticated;
grant  execute on function public.can_edit_team(uuid)                 to authenticated;
grant  execute on function public.reorder_session_items(uuid, uuid[]) to authenticated;


-- -----------------------------------------------------------------------------
-- 12. Storage: bucket privado para fotos de jogadores e imagens de exercícios
-- -----------------------------------------------------------------------------
-- Caminhos: {team_id}/players/{player_id}/{uuid}.webp
--           {team_id}/exercises/{exercise_id}/{uuid}.webp
-- Acesso por URLs assinados de curta duração. Nunca URLs públicos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-media', 'team-media', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy team_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'team-media' and public.is_team_member(public.storage_path_team_id(name)));

create policy team_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'team-media' and public.can_edit_team(public.storage_path_team_id(name)));

create policy team_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'team-media' and public.can_edit_team(public.storage_path_team_id(name)))
  with check (bucket_id = 'team-media' and public.can_edit_team(public.storage_path_team_id(name)));

create policy team_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'team-media' and public.can_edit_team(public.storage_path_team_id(name)));
