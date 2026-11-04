# Overlap — Roadmap

Uma "sessão" são cerca de 2 h com o Claude Code. As estimativas são por alto, para planear e não para cumprir.

| Fase | O que dá | Sessões |
|---|---|---|
| F0 | Setup: projeto, Supabase, Vercel | 1–2 |
| F1 | Login + estrutura da app | 2 |
| F2 | Plantel + observações (**módulo de referência**) | 3 |
| F3 | Jogos + análise pós-jogo | 2 |
| F4 | Biblioteca de exercícios | 2 |
| F5 | Treinos | 3 |
| F6 | Início + app instalável + polimento → **MVP em uso** | 2 |

A ordem prioriza o que se perde se não for registado já: as observações e as jornadas. Os exercícios estão na vossa cabeça e não fogem.

Ficam em stand-by até haver 3–4 semanas de uso real: objetivos coletivos, quadro tático/bolas paradas e modo escuro.

---

## Como trabalhar cada tarefa

1. **Sessão nova no Claude Code.** Usa o pedido-modelo abaixo e começa em plan mode.
2. **Revê o plano:** que ficheiros toca e se a tarefa é só aquela. Aprova.
3. **Deixa implementar.** No fim: `lint`, `typecheck`, `test` e `build` a passar.
4. **Testa no telemóvel:**
   - na mesma rede: `npm run dev -- --hostname 0.0.0.0` e abre `http://<ip-do-portátil>:3000`;
   - ou com o preview da Vercel.
5. **Lê o diff** (`git diff`). Se não percebes uma parte, pede à IA para a explicar antes do commit.
6. **Um commit por tarefa** e marca a caixa ✓ aqui.
7. **Branches:** trabalha em `dev` (a Vercel dá um URL de preview) e faz merge para `main` no fim de cada fase. `main` = a app que o Tiago usa.

**Pedido-modelo:**

```
Tarefa X.Y do docs/ROADMAP.md: <título>.
Lê AGENTS.md. Se precisares, docs/DATABASE.md e docs/DESIGN.md.
Antes de código: ficheiros que vais criar/alterar + plano em 5 linhas. Espera pelo meu ok.
Só esta tarefa. Sem dependências novas. Segue o padrão de src/features/players.
No fim: lint + typecheck + test + build a passar e o que devo testar à mão.
```

**Quando algo corre mal:** `git restore .` (ou `git reset --hard` ao último commit) e pede de novo, com um pedido mais pequeno. Não tentes salvar código que não percebes.

---

## F0 — Setup

**Objetivo:** uma app vazia online, com a base de dados pronta e testada.

- [x] **0.1 Criar o projeto** — feito a 2026-11-04 (Next.js 16.4, Vitest, Prettier)
  - `npx create-next-app@latest overlap` com TypeScript, ESLint, Tailwind, App Router, `src/` e alias `@/*`.
  - Repo privado no GitHub.
  - Prettier + `prettier-plugin-tailwindcss`.
  - Scripts `typecheck` e `test`, e Vitest instalado.
  - *Concluído:* `npm run build` passa.
- [x] **0.2 Documentos** — copiar `AGENTS.md`, `CLAUDE.md`, `docs/` e `supabase/` deste pacote para a raiz do repo.
  - O `.gitignore` inclui `.env*` e `supabase/bootstrap.local.sql`.
  - Commit.
- [x] **0.3 shadcn + tokens + fonte** — falta só validar o `/dev/ui` no teu telemóvel (o registo do shadcn não estava acessível na cloud; os componentes de `src/components/ui` foram escritos à mão, no mesmo padrão)
  - `npx shadcn@latest init`.
  - Aplicar os tokens do `docs/DESIGN.md` no `globals.css`.
  - Archivo via `next/font` com o eixo `wdth`.
  - Adicionar os componentes: button, input, textarea, label, drawer, dialog, dropdown-menu, sonner, skeleton, badge, toggle-group.
  - Página temporária `/dev/ui` com botão, input, uma lista agrupada e chips, para validar o visual no telemóvel.
  - *Concluído:* o `/dev/ui` no telemóvel parece "Overlap", não shadcn por defeito.
- [ ] **0.4 Supabase** — seguir "Arranque" do `docs/DATABASE.md`.
  - *Concluído:* o `rls_smoke.sql` dá 3 × PASS.
- [ ] **0.5 Tipos** — `supabase login` e o script `db:types`, que gera `src/types/database.ts`. Fazer commit dos tipos.
- [ ] **0.6 Vercel**
  - Importar o repo.
  - Env vars: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (a chave publishable; em projetos antigos chama-se "anon").
  - *Concluído:* o URL de produção abre no telemóvel.

## F1 — Login e estrutura

**Objetivo:** entrar no telemóvel uma vez e navegar pelas 5 secções vazias.

- [ ] **1.1 Clientes Supabase + proxy**
  - `src/lib/supabase/server.ts`, `client.ts` e `proxy.ts`, mais o `proxy.ts` na raiz, segundo o guia oficial do `@supabase/ssr` para Next.js.
  - Sem sessão → `/login`, exceto `/login` e assets.
- [ ] **1.2 Login**
  - `/login` com email + password e erro claro ("Email ou password errados").
  - Depois de entrar → `/`. A sessão fica guardada.
  - A ação "Terminar sessão" é uma Server Action.
- [ ] **1.3 `getCurrentTeam()`** em `src/lib/team.ts`.
  - Utilizador sem equipa → página "Sem acesso a nenhuma equipa".
  - Teste unitário do mapeamento.
- [x] **1.4 AppShell** — falta o menu da conta, que depende do login (1.2)
  - Barra inferior no mobile (Início, Plantel, Jogos, Exercícios, Treinos) e barra lateral `navy-deep` a partir de 1024 px.
  - Safe area do iOS. Menu da conta no Início com "Terminar sessão".
  - As 5 páginas com `PageHeader` + `EmptyState`.
- [x] **1.5 Componentes base:** `ResponsiveSheet`, `GroupedList`/`ListRow`, `EmptyState`, `Chip`/`ChipGroup`, `Segmented`; o tipo `ActionResult` em `src/lib/action-result.ts`; e um helper que mostra o toast a partir do resultado.

**Concluído quando:**
- as 2 contas entram no telemóvel;
- um URL aberto sem sessão vai para `/login`;
- as 5 secções navegam.

**Testes:** manual nas 2 contas + Vitest no 1.3.

## F2 — Plantel + observações (módulo de referência)

**Objetivo:** registar observações de verdade a partir do próximo treino. Rever este código com mais calma do que os outros, porque é o padrão que a IA vai copiar.

- [ ] **2.1 Camada de dados de `players`** — `schemas.ts`, `labels.ts` e testes já feitos; falta `queries.ts` e `actions.ts`
  - `schemas.ts`: create e update.
  - `queries.ts`: `listPlayers({ includeArchived })` e `getPlayer(id)`.
  - `actions.ts`: `createPlayer`, `updatePlayer`, `archivePlayer`.
  - `labels.ts` para posições e pé.
  - Testes dos schemas.
- [ ] **2.2 `/plantel`**
  - Lista agrupada com avatar (número em navy), nome e posições.
  - Pesquisa por nome. Arquivados escondidos, com um toggle "Mostrar arquivados".
  - Botão "+" em baixo.
- [ ] **2.3 Criar/editar jogador** num `ResponsiveSheet`.
  - Nome (obrigatório), número, ano, posições (chips múltiplos), pé (segmentado), foco atual.
- [ ] **2.4 `/plantel/[id]`**
  - Ficha compacta com o foco atual editável no sítio.
  - Cronologia de observações (data, autor, contexto treino/jogo), mais recente primeiro.
  - Menu ⋯ com Editar e Arquivar.
- [ ] **2.5 Camada de dados de `observations`** (schema já feito) (schemas, queries por jogador, create/update/delete) + **`QuickObservation`**.
  - Fluxo: escolher jogador numa grelha de números e nomes → textarea com autofocus → Guardar.
  - O botão "Guardar e outro" mantém o sheet aberto para o jogador seguinte.
  - Se houver um `training_session` ou `match` com a data de hoje, liga-o automaticamente (chip removível).
  - Abre a partir da ficha (com o jogador já escolhido). Cada um edita e apaga as suas observações.
  - *Concluído:* observação em < 30 s, cronometrada no telemóvel.
- [ ] **2.6 Foto do jogador** — antes disto, confirmar a autorização de imagem com o clube.
  - `input type=file accept="image/*"` (câmara ou galeria).
  - Redimensionar para 512 px WebP no browser.
  - Upload para `{team_id}/players/{player_id}/{uuid}.webp` e atualizar `photo_path` (apagar a antiga).
  - Mostrar com URL assinado. Opção "Remover foto".
  - Helpers em `src/lib/storage.ts`, para reutilizar na 4.5.
- [ ] **2.7 Backup semanal**
  - `.github/workflows/backup.yml` com cron ao domingo de madrugada.
  - `pg_dump` (versão igual à do projeto) pela connection string do Session pooler (secret `SUPABASE_DB_URL`).
  - Cifrar com `gpg --symmetric --batch --passphrase` (secret `BACKUP_PASSPHRASE`).
  - Upload como artifact com retenção de 30 dias.
  - Correr à mão uma vez, descarregar e decifrar para confirmar que funciona.

**Concluído quando:**
- os jogadores reais estão carregados;
- o Tiago registou pelo menos uma observação sozinho;
- o primeiro backup foi feito e decifrado.

## F3 — Jogos + análise

**Objetivo:** nenhuma jornada fica sem registo.

- [ ] **3.1 Camada de dados de `matches`** (schemas, labels e testes já feitos), a copiar o padrão de `players`, mais testes dos schemas (resultado: os dois golos ou nenhum).
- [ ] **3.2 `/jogos`**
  - Separadores Próximos | Realizados.
  - Linha com data, adversário, casa/fora e `ResultBadge` + `3–1`. O próximo jogo tem o marcador gold.
- [ ] **3.3 Criar/editar jogo** (sheet): data, hora, adversário, casa/fora, tipo, competição.
  - **"Adicionar vários":** formulário em linhas (data, adversário, casa/fora) para meter o calendário da época de uma vez.
- [ ] **3.4 `/jogos/[id]`**
  - Cabeçalho com o resultado. "Registar resultado" abre um sheet com 2 steppers.
  - Análise em 3 blocos (Correu bem, Correu mal, O que trabalhar), editáveis, com "Guardar".
  - Links ZeroZero e vídeo (abrem num separador novo).
- [ ] **3.5 Observações do jogo:** lista das observações ligadas + botão "Observação" (`QuickObservation` com o jogo já ligado).

**Concluído quando:**
- as 2 jornadas já jogadas e o resto do calendário estão registados;
- a análise do jogo do fim de semana foi feita no telemóvel.

## F4 — Biblioteca de exercícios

**Objetivo:** encontrar qualquer exercício em < 10 s, no campo.

- [ ] **4.1 Camada de dados de `exercises`** (schemas, labels e testes já feitos) + `labels.ts` das etiquetas + testes.
- [ ] **4.2 `/exercicios`**
  - Pesquisa (nome e descrição, `ilike`) + chips de etiquetas (overlap `&&`), ambos nos search params.
  - Linha com nome, etiquetas, minutos e nº de jogadores.
- [ ] **4.3 Criar/editar**
  - Nome + etiquetas no topo.
  - Secção recolhida "Mais detalhes": descrição, objetivos, jogadores, duração, espaço, material, organização, regras, variantes, pontos de correção.
- [ ] **4.4 `/exercicios/[id]`:** vista de leitura com a imagem grande primeiro, depois as secções preenchidas (as vazias não aparecem), texto 17 px.
- [ ] **4.5 Imagem do exercício:** reutilizar o `src/lib/storage.ts` com 1600 px.
- [ ] **4.6 Duplicar** (cria "Nome (variante)" e abre a edição) e **Arquivar**. Nunca há um botão "Apagar".

**Concluído quando:** há 15+ exercícios reais carregados e o teste dos 10 s passa.

## F5 — Treinos

**Objetivo:** os 3 treinos da semana planeados na app.

- [ ] **5.1 Camada de dados de `training`** (schemas, `sumMinutes`/`timeBarSegments` e testes já feitos)
  - Sessões e itens.
  - Ação `reorderItems` que usa a RPC `reorder_session_items`.
  - Função pura `sumMinutes` com teste.
- [ ] **5.2 `/treinos`**
  - Próximos | Histórico.
  - Linha com dia da semana + data, total/alvo e estado. O próximo tem o marcador gold.
- [ ] **5.3 Criar treino** (sheet): data, hora, duração alvo (60 por defeito), objetivo.
- [ ] **5.4 `/treinos/[id]`**
  - `TimeBar` + lista numerada de itens com `MinutesStepper` (±5).
  - "Adicionar exercício" abre um sheet com pesquisa + chips da biblioteca, ou um item livre.
  - Total vs. alvo sempre visível.
- [ ] **5.5 Reordenar**
  - Botões subir/descer no mobile.
  - Arrastar no desktop (perguntar antes de adicionar o `dnd-kit`).
- [ ] **5.6 Material:** lista sem repetidos a partir do `equipment` dos exercícios usados.
- [ ] **5.7 Duplicar treino:** escolher a nova data, copiar os itens e os minutos.
- [ ] **5.8 Fecho do treino:** "Marcar como realizado" + nota pós-treino + atalho "Observações deste treino".
  - O atalho abre o `QuickObservation` com o treino já ligado.
- [ ] **5.9 Vista do campo:** tocar num item da biblioteca abre a vista de leitura do exercício, com voltar para o treino.

**Concluído quando:** uma semana inteira (3 treinos) foi planeada e fechada na app.

## F6 — Início + app instalável → MVP em uso

- [ ] **6.1 Início**
  - Próximo treino (com `TimeBar`), próximo jogo e último resultado.
  - 3 ações rápidas: Observação, Novo treino, Registar jogo.
  - Mais nada.
- [ ] **6.2 PWA**
  - `app/manifest.ts` com nome "Overlap", `display: standalone` e cor `#12306B`.
  - Ícones 192/512 + apple-touch-icon (um "O" branco sobre navy serve por agora).
  - Sem service worker.
- [ ] **6.3 Polimento:** estados vazios, skeletons, erros, alvos de 44 px, inputs de 16 px, o teclado não tapa o botão de guardar, textos PT-PT revistos.
- [ ] **6.4 Revisão de segurança**
  - RLS ativa em todas as tabelas: `select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r';`
  - O bucket está privado.
  - `grep` por `service_role`/`sb_secret` no repo devolve zero.
  - O `rls_smoke` passa.
  - Nenhum dado real no git (`git log -p | grep` por nomes de jogadores).
- [ ] **6.5 README.md** curto para o portefólio: o que é, screenshots, stack, decisões de segurança (RLS e FKs compostas), como correr.

**MVP em uso.** Depois, 3–4 semanas a usar sem mexer em código. Só então se decide o que vem a seguir.

---

## Depois do MVP (stand-by)

- **Objetivos coletivos:** tabela `team_objectives` + ligações a exercícios e treinos. O objetivo nasce do "O que trabalhar" de um jogo.
- **Quadro tático / bolas paradas:** campo em SVG, estado guardado em JSON (`jsonb`).
- **Modo escuro:** os tokens já estão no `DESIGN.md`, falta a variante escura.
- **Conta só de leitura para o Sr. Fernando:** já suportada pela base de dados (papel `staff`). Basta criar a conta e uma linha no `team_members`.
