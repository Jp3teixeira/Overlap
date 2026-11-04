<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Overlap — contexto para agentes de AI

Lê isto no início de cada sessão. Para detalhe: `docs/PRD.md` (o quê), `docs/DATABASE.md` (dados e segurança), `docs/DESIGN.md` (visual), `docs/ROADMAP.md` (tarefas).

## O projeto

App web privada para a equipa técnica do Candal Sub-11 (2 treinadores):

- plantel + observações;
- jogos + análise pós-jogo;
- biblioteca de exercícios;
- planeamento de treinos.

É usada sobretudo **no telemóvel, no campo, por pessoas com pouca paciência**. Cada ecrã tem de ser rápido.

## Stack

- **Next.js 16.4** (App Router) com `cacheComponents: true`. O ficheiro de interceção é `proxy.ts`, não `middleware.ts`.
  Ler `cookies()`/sessão só dentro de `<Suspense>` (é erro de build fora). Antes de mexer em auth, lê
  `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.
- **TypeScript** em `strict`.
- **Tailwind CSS v4** + componentes ao estilo **shadcn/ui** em `src/components/ui` (feitos sobre `radix-ui` e `vaul`), com ícones `lucide-react` e toasts `sonner`.
  Para acrescentar um componente: `npx shadcn@latest add <nome>` no teu PC e ajustar aos tokens.
- **Fonte:** Archivo variável, self-hosted em `src/fonts` (`next/font/local`). Sem pedidos ao Google.
- **Supabase** (Postgres, Auth, Storage) via `@supabase/ssr`.
- **Zod** para validação; **react-hook-form** + `@hookform/resolvers/zod` nos formulários.
- **Vitest** para testes unitários.
- **Vercel** (deploy) e **GitHub** (repo privado).

```bash
npm run dev         # desenvolvimento
npm run lint
npm run typecheck   # tsc --noEmit
npm run test        # vitest run
npm run build
npm run db:types    # supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/database.ts
```

## Estrutura

```
proxy.ts                      # refresca a sessão; redireciona quem não tem sessão para /login
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx          # AppShell autenticado (nav inferior / barra lateral)
    (app)/page.tsx            # Início
    (app)/plantel/...         # rotas em PT; código em EN
    (app)/jogos/...
    (app)/exercicios/...
    (app)/treinos/...
  components/ui/              # gerado pelo shadcn — só se mexe nos tokens
  components/                 # componentes partilhados (AppShell, ResponsiveSheet, TimeBar...)
  features/<module>/          # players, observations, matches, exercises, training
    schemas.ts                # Zod: validação partilhada entre o form e o servidor
    queries.ts                # leituras ("server-only")
    actions.ts                # Server Actions (escritas)
    labels.ts                 # textos PT dos enums
    components/               # UI do módulo
  lib/
    supabase/{server,client,proxy}.ts
    team.ts                   # getCurrentTeam()
    action-result.ts          # tipo ActionResult + helpers
    storage.ts                # upload + URLs assinados
    dates.ts                  # datas em pt-PT, Europe/Lisbon
  types/database.ts           # GERADO — não editar
supabase/migrations/          # fonte da verdade do schema
supabase/tests/rls_smoke.sql
docs/
```

**`src/features/players` é o módulo de referência.** Os módulos seguintes copiam o seu padrão.

## Padrões obrigatórios

**Ler dados.** Os Server Components chamam funções de `features/<m>/queries.ts`. Nada de `useEffect` + fetch para carregar páginas.

**Escrever dados.** As Server Actions em `features/<m>/actions.ts` seguem sempre esta ordem:

1. `schema.safeParse(input)`
2. `createClient()` do servidor
3. confirmar o utilizador: `getUser()`/`getClaims()`, conforme o guia oficial do `@supabase/ssr`. O proxy sozinho não protege Server Actions.
4. a query
5. `revalidatePath(...)`
6. devolver um `ActionResult`

```ts
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

Os erros esperados não fazem `throw` para o cliente. A mensagem de erro é em PT-PT e diz como resolver.

**Páginas (cacheComponents).** O shell da página é estático. Os dados vêm de um componente `async` dentro de `<Suspense>` (com um skeleton), que chama `getCurrentTeam()` e depois as queries. Nunca ler sessão/cookies no topo de um layout.

**Equipa.** O `getCurrentTeam()` devolve `{ id, name, role, displayName }`. Todos os inserts levam `team_id`. Se o utilizador não tiver equipa, vê a página "Sem acesso".

**Segurança.**
- A RLS é a última linha de defesa e está sempre ativa.
- A chave `service_role`/secret nunca entra no código da app.
- No cliente só existem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**Estado.** Não há store global. Filtros e pesquisa ficam nos search params do URL. O estado local é `useState`.

**Imagens.**
- Comprimir no browser para WebP antes do upload: 512 px para jogadores, 1600 px para exercícios.
- Caminho `{team_id}/{players|exercises}/{id}/{uuid}.webp`.
- Mostrar com URL assinado de 1 h, gerado no servidor.

**Datas.** Fuso Europe/Lisbon. As colunas `date` não têm hora nem fuso. A formatação é pt-PT ("qua, 5 nov").

**Nomes.** Código, ficheiros e base de dados em inglês. Rotas e toda a UI em PT-PT.
Os schemas Zod usam os **nomes das colunas da BD (snake_case)**, para o resultado do `safeParse` ir direto para o `insert`/`update` sem camada de mapeamento.
As listas de valores (posições, etiquetas, etc.) vivem nos `labels.ts` e têm de bater certo com os enums da migração.

**UI.** Segue o `docs/DESIGN.md`: usar primeiro os componentes de `src/components`, só os tokens definidos, inputs com 16 px, alvos de toque com 44 px.

## Regras para o agente

1. **Uma tarefa de cada vez,** pelo ID do `docs/ROADMAP.md`. Não implementes nada que não foi pedido.
2. **Antes de escrever código:** diz que ficheiros vais criar ou alterar e o plano em 5 linhas. Espera pelo ok.
3. **Toca só nesses ficheiros.** Nada de refactors, renomeações ou "melhorias" fora do âmbito.
4. **Sem dependências novas sem perguntar.**
5. **Schema:** nunca edites uma migração aplicada. Uma mudança é sempre uma migração nova + atualizar o `docs/DATABASE.md` + `npm run db:types`. Uma tabela nova leva `team_id` + RLS + políticas + entrada no `rls_smoke.sql`.
6. **Nunca dados reais de jogadores** em código, seeds, testes, logs ou commits.
7. Se o pedido contradiz estes documentos, **para e pergunta**.
8. **No fim de cada tarefa:**
   - `lint`, `typecheck`, `test` e `build` a passar;
   - lista curta do que testar à mão no telemóvel;
   - sugestão de mensagem de commit: `feat(plantel): 2.3 criar e editar jogador`.

## Testes

- **Vitest:** schemas Zod e funções puras (totais de minutos, datas, mapas de labels). Os ficheiros `*.test.ts` ficam ao lado do código.
- **SQL:** `supabase/tests/rls_smoke.sql` depois de qualquer mudança à base de dados.
- **Manual:** no telemóvel real, com as 2 contas. Não há testes E2E no MVP.
