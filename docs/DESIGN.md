# Overlap — Design

## Direção

**Uma ficha de treinador, não um dashboard.** É uma ferramenta de trabalho calma: fundo claro, o azul-escuro do Candal na estrutura (navegação, botões, texto) e informação densa em listas, como uma folha de jogo bem arrumada.

O clube aparece na cor, não no logótipo. Nada de emblema espalhado, nada do estilo dos posts do Instagram (itálico condensado de cartaz, gradientes, brilhos, figuras épicas). É quase o oposto: sóbrio, legível ao sol, rápido de usar com uma mão.

**O elemento memorável é um só: a barra de tempo do treino.** É uma faixa horizontal com um segmento por exercício, proporcional aos minutos. Aparece no treino e no Início. Tudo o resto fica quieto.

## Cor

Modo claro por defeito (legível ao sol). O modo escuro fica para depois do MVP, já com tokens.

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#0E1B33` | Texto principal (preto puxado ao azul) |
| `navy` | `#12306B` | Botões primários, item ativo da navegação, links |
| `navy-deep` | `#0A1D45` | Barra lateral no desktop, estado pressionado |
| `field` | `#F3F5F8` | Fundo da página (cinza frio, não creme) |
| `paper` | `#FFFFFF` | Superfícies: listas, sheets, inputs |
| `line` | `#DDE2EA` | Bordas e divisórias |
| `muted` | `#5B6780` | Texto secundário, metadados |
| `gold` | `#E2B33A` | **Só** o marcador "hoje / a seguir". Nunca como cor de texto |

**Resultados:** vitória `#1E7A4A`, empate `#6B7280`, derrota `#B33A3A`. São usados só no badge V/E/D.

**Tons da barra de tempo:** os segmentos seguem a ordem do treino, a ciclar `#0A1D45` → `#2F5596` → `#7E9CCB` → `#B5C6E3`, com um intervalo branco de 2 px entre eles.

Tokens para o `globals.css`, nomes compatíveis com o shadcn/ui:

```css
:root {
  --background: #F3F5F8;
  --foreground: #0E1B33;
  --card: #FFFFFF;
  --card-foreground: #0E1B33;
  --popover: #FFFFFF;
  --popover-foreground: #0E1B33;
  --primary: #12306B;
  --primary-foreground: #FFFFFF;
  --secondary: #E8EDF5;
  --secondary-foreground: #12306B;
  --muted: #EEF1F5;
  --muted-foreground: #5B6780;
  --accent: #E8EDF5;
  --accent-foreground: #12306B;
  --destructive: #B33A3A;
  --border: #DDE2EA;
  --input: #DDE2EA;
  --ring: #12306B;
  --radius: 0.625rem; /* 10px */

  --sidebar: #0A1D45;
  --sidebar-foreground: #E7ECF5;
  --marker: #E2B33A;
  --result-win: #1E7A4A;
  --result-draw: #6B7280;
  --result-loss: #B33A3A;
  --time-1: #0A1D45;
  --time-2: #2F5596;
  --time-3: #7E9CCB;
  --time-4: #B5C6E3;
}
/* Mapear os tokens extra no @theme inline do Tailwind v4, ex.:
   --color-marker: var(--marker); --color-result-win: var(--result-win); ... */
```

## Tipografia

Uma só família: **Archivo** (Google Fonts, variável, com os eixos de peso e largura). Carrega-se com `next/font/google` e `axes: ['wdth']`.

| Uso | Tamanho / altura de linha | Peso | Largura |
|---|---|---|---|
| Título de página | 26 / 30 | 650 | 88% (semi-condensada) |
| Título de secção | 20 / 26 | 600 | 88% |
| Texto, linhas de lista | 15–16 / 22 | 400–500 | 100% |
| Metadados | 13 / 18 | 450 | 100% |
| Inputs | **16 px no mínimo** | 400 | 100% |

O mínimo de 16 px nos inputs evita que o iOS faça zoom ao focar.

A largura semi-condensada nos títulos dá um ar de desporto sem cair no cartaz. Os números (resultados, minutos, camisolas) usam sempre `tabular-nums`, e o resultado escreve-se `3–1` com travessão.

**Não fazer:** rótulos em maiúsculas espaçadas; destacar uma palavra do título com outra cor ou itálico; eyebrow labels por cima dos títulos.

## Forma e espaço

- **Grelha:** base de 4 px. Margem lateral de 16 px no mobile. 24 px entre secções.
- **Raios:** 10 px em controlos e listas agrupadas; 16 px no topo dos sheets.
- **Bordas:** 1 px em `line`.
- **Sombras:** só em sheets, menus e toasts. Listas e páginas não têm sombra.
- **Listas agrupadas em vez de cartões:** linhas dentro de um único contentor com borda e divisórias, como as Definições do iOS. Nada de grelhas de cartões soltos.
- **Ícones:** Lucide, 20 px, traço 1.75. Nunca emojis como ícones.
- **Alvos de toque:** pelo menos 44 × 44 px. A ação principal fica ao alcance do polegar (em baixo).
- **Movimento:** só em resposta a ações (abrir um sheet, confirmar). Sem animações de entrada.

## Navegação e páginas

**Mobile (< 1024 px):** barra inferior fixa com 5 separadores: Início, Plantel, Jogos, Exercícios, Treinos. O separador ativo fica em `navy`, os outros em `muted`. Respeita a safe area do iOS.

**Desktop (≥ 1024 px):** barra lateral de 240 px em `navy-deep`. O conteúdo tem no máximo 720 px nas listas e 960 px nas vistas de detalhe.

**Formulários:** num `ResponsiveSheet`, que é uma gaveta inferior no mobile e um diálogo no desktop. Nunca páginas de formulário longas.

```
/login
/                       Início
/plantel                lista
/plantel/[id]           ficha + cronologia
/jogos                  Próximos | Realizados
/jogos/[id]             resultado + análise + observações
/exercicios             pesquisa + etiquetas
/exercicios/[id]        vista de leitura (campo)
/treinos                Próximos | Histórico
/treinos/[id]           plano + barra de tempo + fecho
```

### Início

```
┌───────────────────────────────┐
│ Overlap                   (J) │  ← menu da conta: terminar sessão
│                               │
│ Próximo treino                │
│ ▌Qua 5 nov, 19:15   45/60 min │  ← ▌ = marcador gold
│ ████▌██████▌█████▌███         │  ← barra de tempo
│                               │
│ Próximo jogo                  │
│  Sáb 8 nov, FC Infesta (fora) │
│ Último resultado              │
│  [V] Candal 3–1 Leça Balio    │
│                               │
│ [ Observação ][Treino ][ Jogo]│  ← 3 ações rápidas
├───────────────────────────────┤
│ Início Plantel Jogos Exerc. Tr│
└───────────────────────────────┘
```

### Ficha do jogador

```
┌───────────────────────────────┐
│ ‹ Plantel                  ⋯  │
│ (7)  Tomás R.                 │  ← avatar: foto ou número
│      Extremo, médio. Direito  │
│                               │
│ Foco atual                    │
│ Receber de costas e rodar  ✎  │
│                               │
│ Observações                   │
│ ┌───────────────────────────┐ │
│ │ 3 nov, Tiago, no treino   │ │
│ │ Boa intensidade no 1x1... │ │
│ ├───────────────────────────┤ │
│ │ 1 nov, João, vs Leça      │ │
│ │ Pressão alta muito boa... │ │
│ └───────────────────────────┘ │
│                               │
│ [   Adicionar observação    ] │  ← fixo em baixo
└───────────────────────────────┘
```

### Treino

```
┌───────────────────────────────┐
│ ‹ Treinos              Editar │
│ Quarta, 5 nov, 19:15          │
│ Objetivo: reação à perda      │
│ ████▌██████▌█████▌███  45/60  │
│                               │
│ 1  Aquecimento             5' │  ← sequência real, números justificados
│ 2  Jogo do Galo           10' │
│ 3  1x1 + Transição        15' │
│ 4  Jogo final             15' │
│ + Adicionar exercício         │
│                               │
│ Material: bolas, coletes, 8 c.│
│                               │
│ [   Marcar como realizado   ] │
└───────────────────────────────┘
```

## Componentes da app

Ficam em `src/components` e são feitos por cima do shadcn/ui.

| Componente | O que faz |
|---|---|
| `AppShell` | Barra inferior (mobile) ou lateral (desktop), cabeçalho de página |
| `PageHeader` | Título, botão de voltar, ação à direita |
| `GroupedList` / `ListRow` | Linhas agrupadas: título, metadados, chevron, slot à direita |
| `ResponsiveSheet` | Gaveta (Drawer do shadcn) no mobile, diálogo no desktop |
| `Chip` / `ChipGroup` | Etiquetas e posições (seleção múltipla) |
| `Segmented` | Escolha curta: casa/fora, pé dominante |
| `MinutesStepper` | Minutos com −5 / +5 |
| `TimeBar` | Barra de tempo do treino (o elemento memorável) |
| `ResultBadge` | V / E / D com a cor do resultado |
| `PlayerAvatar` | Foto (URL assinado) ou número da camisola em navy |
| `QuickObservation` | Sheet de observação rápida (escolher jogador → texto → guardar) |
| `EmptyState` | Uma frase sobre o que fazer + um botão |

## Texto da interface

- PT-PT, frases curtas, maiúscula só no início.
- Botões dizem o que acontece: "Guardar", "Adicionar observação", "Marcar como realizado". O toast repete o verbo: "Observação guardada".
- Os estados vazios dizem o que fazer, por exemplo: "Ainda não há jogos. Adiciona o calendário da época."
- Os erros dizem o que correu mal e como resolver, sem pedir desculpa.

## Proibido (os sinais de "feito por IA")

Gradientes, brilhos, glassmorphism, sombras em tudo, grelhas de cartões iguais, cartões de estatísticas com números gigantes, emojis como ícones, ilustrações, animações de entrada, maiúsculas espaçadas, `→` no fim dos botões, fundo creme, e o emblema do clube repetido.
