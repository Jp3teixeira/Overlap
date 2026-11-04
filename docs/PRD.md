# Overlap — PRD

> Versão MVP · atualizado a 2026-11-04 · dono: João Teixeira

## O que é

App web privada para a equipa técnica do Candal Sub-11. Junta num só sítio o que hoje vive na cabeça de dois treinadores: o plantel e as observações sobre cada miúdo, os jogos e a análise pós-jogo, os exercícios que usamos e o planeamento dos treinos.

**Proposta de valor:** preparar e registar o trabalho da equipa técnica mais depressa do que numa mensagem de WhatsApp.

**Concorrente real:** WhatsApp entre treinadores + notas do telemóvel. Se uma ação demorar mais do que isso, perde.

## Utilizadores

| Quem | Papel na app | Notas |
|---|---|---|
| João Teixeira | `owner` | Treinador-adjunto, desenvolve a app |
| Tiago Bandeira | `coach` | Treinador principal |
| Sr. Fernando | `staff` (só leitura) | Futuro, fora do MVP |

Sem contas de pais nem jogadores. As contas são criadas à mão no Supabase (não há registo na app).

## Princípios (valem para cada ecrã)

1. **Telemóvel primeiro.** Tudo pensado para uma mão, no campo. O computador é secundário.
2. **Registar uma observação em menos de 30 segundos.** No máximo 3 toques mais o texto.
3. **Quase tudo opcional.** Obrigatório só o mínimo para o registo fazer sentido.
4. **Sem notas, rankings ou comparações entre crianças.** Texto livre, não números.
5. **Dados mínimos.** Ver "Dados e privacidade".
6. **A segurança vive na base de dados (RLS),** nunca só na interface.

## MVP

### Must have

**Login**
- Email + password, sessão persistente (entrar uma vez no telemóvel e ficar).
- Sem registo, sem recuperação de password na app (resolve-se no dashboard do Supabase).

**Plantel + observações**
- Lista de jogadores: foto ou número, nome, posições.
- Ficha: nome, número, ano de nascimento, posições, pé, **foco atual** (1 linha), foto.
- Cronologia de observações (mais recente primeiro, com autor e ligação ao treino/jogo).
- **Observação rápida:** escolher jogador → escrever → guardar. Se houver treino ou jogo hoje, liga-se sozinha.
- Arquivar jogador (não apagar).
- *Aceitação:* observação registada em < 30 s, cronometrada no telemóvel.

**Jogos + análise**
- Calendário: data, hora, adversário, casa/fora, tipo (oficial/particular/torneio), competição.
- "Adicionar vários" para carregar o calendário da época de uma vez.
- Resultado + análise em 3 campos: *Correu bem*, *Correu mal*, *O que trabalhar*.
- Links opcionais: página do ZeroZero e vídeo.
- Observações de jogadores ligadas ao jogo.
- *Aceitação:* análise do jogo de fim de semana feita no telemóvel em < 3 min.

**Biblioteca de exercícios**
- Obrigatório: nome + pelo menos 1 etiqueta. Tudo o resto em "Mais detalhes".
- Etiquetas (várias por exercício, lista fixa): aquecimento, guarda-redes, passe e receção, condução, finalização, 1x1, superioridade/inferioridade, posse, transições, organização defensiva, organização ofensiva, bolas paradas, jogos reduzidos.
- Pesquisa por texto + filtro por etiquetas.
- 1 imagem (foto de um esquema desenhado à mão).
- Vista de leitura para o campo. Duplicar (para variantes). Arquivar.
- *Aceitação:* encontrar um exercício em < 10 s no telemóvel.

**Treinos**
- Criar sessão: data, hora, duração alvo, objetivo.
- Itens ordenados: da biblioteca ou item livre ("Jogo final"), cada um com duração.
- Reordenar, total automático vs. alvo, barra de tempo.
- Material do treino juntado a partir dos exercícios.
- Duplicar treino.
- Fecho: marcar como realizado + nota pós-treino + observações ligadas.
- *Aceitação:* planear um treino de 5 exercícios em < 3 min.

**Início**
- Próximo treino, próximo jogo, último resultado, 3 atalhos (Observação, Novo treino, Registar jogo). Nada mais.

### Should have
- App instalável no ecrã principal (PWA básica, sem offline).

### Could have
- Exportar dados (CSV).
- Modo escuro (os tokens já estão preparados).

### Won't have (por agora)
- Objetivos coletivos e individuais → stand-by, primeiro candidato depois do MVP.
- Quadro tático / bolas paradas visuais → stand-by.
- Marcadores, assistências, estatísticas (o ZeroZero já tem).
- Contas de pais/jogadores, notificações, IA, modo offline, várias equipas na interface.

## Fluxos principais

1. **Depois do treino:** Início → Observação → escolher jogador → escrever (ou ditar) → Guardar. Repetir para o próximo jogador sem fechar.
2. **Depois do jogo:** Jogos → jogo de hoje → Registar resultado → 3 campos → Guardar → Observações.
3. **Preparar treino:** Treinos → Novo (ou Duplicar o último) → Adicionar exercícios → acertar minutos → Guardar.
4. **No campo:** Treinos → treino de hoje → tocar num exercício → vista de leitura.
5. **Carregar a época:** Jogos → Adicionar vários → colar/escrever jornadas.

## Dados e privacidade

Guardamos de cada jogador: nome como é chamado, número, ano de nascimento, posições, pé, foco atual, foto, observações.

Não guardamos: data de nascimento completa, contactos, dados de saúde, notas numéricas.

Regras:
- Fotos num bucket **privado**, servidas por URLs assinados de curta duração. Nunca URLs públicos.
- Antes de carregar fotos: confirmar com o clube (Sr. Fernando) que a autorização de imagem da inscrição cobre uso interno pela equipa técnica.
- Escrever cada observação como se o encarregado de educação a fosse ler (pode pedir acesso ao abrigo do RGPD).
- Cada equipa só vê os seus dados (RLS, testado). Se a app for usada por outras equipas, o isolamento já existe.
- Nunca dados reais de jogadores em código, seeds, testes ou commits.
- Backup semanal cifrado (o plano grátis do Supabase não tem backups).

## Critérios de sucesso (4 semanas depois do MVP em uso)

- Pelo menos 2 dos 3 treinos semanais planeados na app.
- 1 análise por jogo.
- O Tiago abre a app sem ninguém lhe pedir.
- Observação em < 30 s, medida no campo.

## Registo de decisões

| Data | Decisão | Porquê |
|---|---|---|
| 2026-11-04 | Nome: **Overlap** | Movimento do jogo, curto, não grita "Candal" |
| 2026-11-04 | Stack: Next.js + Supabase + Vercel | Já conhecida, a melhor para AI coding, grátis |
| 2026-11-04 | Etiquetas múltiplas de lista fixa (enum) em vez de categoria única | Um exercício cruza categorias |
| 2026-11-04 | Fotos de jogadores: sim, bucket privado + URL assinado | Pedido do João; autorização do clube a confirmar |
| 2026-11-04 | Marcadores/assistências fora | O ZeroZero já guarda |
| 2026-11-04 | Objetivos e quadro tático em stand-by | Não atrasar o MVP |
| 2026-11-04 | Bolas paradas = só a etiqueta na biblioteca | Custo zero |
| 2026-11-04 | Só online (sem modo offline) | Ambos têm dados móveis |
| 2026-11-04 | Visual claro, azul-escuro + branco, marca discreta | Pedido do João |
| 2026-11-04 | Ordem: plantel → jogos → exercícios → treinos | Dados que se perdem primeiro (jornadas, observações) |
| 2026-11-04 | Contas criadas à mão, sem registo/recuperação na app | 2 utilizadores, menos ecrãs |
