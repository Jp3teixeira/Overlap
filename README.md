# Overlap

App web privada para a equipa técnica do Candal Sub-11: plantel e observações, jogos e análise pós-jogo, biblioteca de exercícios e planeamento de treinos. Pensada para o telemóvel, no campo.

- **Stack:** Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4, Radix/Vaul, Supabase (Postgres + Auth + Storage), Zod, Vitest, Vercel.
- **Segurança:** Row Level Security em todas as tabelas, isolamento por equipa garantido por chaves estrangeiras compostas, bucket de imagens privado com URLs assinados. Ver `docs/DATABASE.md`.

```bash
npm install
npm run dev        # http://localhost:3000 — kit visual em /dev/ui
npm run test       # testes unitários (schemas, datas, enums vs. migrações)
npm run typecheck
npm run build
```

Documentação: `docs/PRD.md` (produto), `docs/DESIGN.md` (visual), `docs/DATABASE.md` (dados e segurança), `docs/ROADMAP.md` (tarefas). Contexto para agentes de AI: `AGENTS.md`.
