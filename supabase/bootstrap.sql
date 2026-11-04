-- =============================================================================
-- Overlap — bootstrap (correr UMA vez, no SQL Editor, depois da migração 0001)
--
-- Antes: em Authentication → Users → "Add user" → "Create new user", cria as
-- 2 contas (email + password, "Auto Confirm User" ligado). Copia os UUIDs.
-- Copia para supabase/bootstrap.local.sql (está no .gitignore) e preenche LÁ os UUIDs.
-- Este ficheiro não é uma migração; a versão preenchida nunca vai para o git.
-- =============================================================================
with t as (
  insert into public.teams (name) values ('Candal Sub-11') returning id
)
insert into public.team_members (team_id, user_id, role, display_name)
select t.id, m.user_id, m.role::public.team_role, m.display_name
from t,
(values
  ('UUID_DO_JOAO'::uuid,  'owner', 'João'),
  ('UUID_DO_TIAGO'::uuid, 'coach', 'Tiago')
) as m(user_id, role, display_name);

-- Mais tarde, para dar acesso só de leitura ao Sr. Fernando:
-- insert into public.team_members (team_id, user_id, role, display_name)
-- values ((select id from public.teams limit 1), 'UUID_DO_FERNANDO', 'staff', 'Sr. Fernando');
