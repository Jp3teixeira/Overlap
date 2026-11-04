-- =============================================================================
-- Overlap — bootstrap (correr no SQL Editor, depois da migração 0001)
--
-- Antes: Authentication → Users → "Add user" → "Create new user"
-- (email + password, com "Auto Confirm User" ligado).
-- Troca o email abaixo no SQL Editor e corre. Não guardes no git a versão com emails.
-- =============================================================================

-- 1) Cria a equipa e põe-te como owner.
--    Se o resultado disser "0 rows", o email não bate certo com o da conta (e nada foi criado).
with u as (select id from auth.users where email = lower(trim('O_TEU_EMAIL'))),
t as (insert into public.teams (name) select 'Candal Sub-11' from u returning id)
insert into public.team_members (team_id, user_id, role, display_name)
select t.id, u.id, 'owner', 'João' from t, u;

-- 2) Quando criares a conta do Tiago, tira os "--" e troca o email:
-- insert into public.team_members (team_id, user_id, role, display_name)
-- select (select id from public.teams order by created_at limit 1), id, 'coach', 'Tiago'
-- from auth.users where email = lower(trim('EMAIL_DO_TIAGO'));

-- 3) Mais tarde, acesso só de leitura para o Sr. Fernando: igual ao 2), com 'staff' e 'Sr. Fernando'.
