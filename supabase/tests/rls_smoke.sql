-- =============================================================================
-- Overlap — teste rápido de segurança (RLS)
-- Correr no SQL Editor do Supabase DEPOIS do bootstrap (equipa + membros criados).
-- Tudo corre dentro de uma transação com ROLLBACK: não deixa dados nenhuns.
-- Resultado esperado: 3 mensagens "PASS" e nenhum "FAIL".
-- Correr sempre que mexeres em políticas ou criares tabelas novas.
-- =============================================================================
begin;

select set_config('test.team_id',
  (select id::text from public.teams order by created_at limit 1), true);
select set_config('test.member_id',
  (select user_id::text from public.team_members
   where team_id = current_setting('test.team_id')::uuid and role in ('owner', 'coach')
   limit 1), true);

-- A) Visitante anónimo: não pode ler nada
set local role anon;
do $$ begin
  begin
    perform 1 from public.players limit 1;
    raise exception 'FAIL A: anónimo conseguiu ler jogadores';
  exception when insufficient_privilege then
    raise notice 'PASS A: anónimo sem acesso';
  end;
end $$;
reset role;

-- B) Utilizador autenticado que NÃO é da equipa: não vê nem escreve nada
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}';
do $$
declare n int; t text;
begin
  foreach t in array array['teams', 'team_members', 'players', 'player_observations', 'exercises',
                           'training_sessions', 'training_session_exercises', 'matches'] loop
    execute format('select count(*) from public.%I', t) into n;
    if n <> 0 then raise exception 'FAIL B: estranho vê % linhas em %', n, t; end if;
  end loop;
  begin
    insert into public.players (team_id, name) values (current_setting('test.team_id')::uuid, 'Intruso');
    raise exception 'FAIL B: estranho inseriu um jogador';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS B: estranho não vê nem escreve nada';
end $$;
reset role;

-- C) Treinador da equipa: lê e escreve; não pode assinar como outra pessoa
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.member_id'), 'role', 'authenticated')::text, true);
do $$
declare pid uuid;
begin
  insert into public.players (team_id, name)
  values (current_setting('test.team_id')::uuid, 'Jogador Teste') returning id into pid;
  insert into public.player_observations (team_id, player_id, body)
  values (current_setting('test.team_id')::uuid, pid, 'Observação de teste');
  begin
    insert into public.player_observations (team_id, player_id, body, author_id)
    values (current_setting('test.team_id')::uuid, pid, 'Autor falso', '00000000-0000-0000-0000-0000000000ff');
    raise exception 'FAIL C: aceitou observação com autor falso';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS C: treinador lê e escreve; autor protegido';
end $$;
reset role;

rollback;
