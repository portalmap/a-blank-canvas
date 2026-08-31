# Melhorias de uso em mobile e telas pequenas

Prioridade segue desktop: nada muda em telas `lg+`. Todos os ajustes são adições de breakpoints (`base` → `md`/`lg`), módulo por módulo, sem tocar em regras de negócio, hooks ou banco.

## Problemas encontrados (verificados no código)

1. **Alturas travadas em `h-screen`** — `HomePage`, `TaskView` e `Chat` usam `h-screen`/`h-[calc(100vh-0px)]` dentro de um layout que já é `h-screen` com header mobile por cima. No celular isso empurra conteúdo para fora da tela e cria rolagem dupla.
2. **Início (HomePage)** — a linha superior tem altura fixa `flex: 0 0 40%` e o feed é `flex-1` com `overflow-hidden`: no celular sobram poucos pixels por card, cada um com rolagem interna.
3. **Chat** — `ResizablePanelGroup direction="horizontal"` sempre horizontal: no celular a lista de canais e a conversa dividem a largura, deixando as duas inutilizáveis.
4. **Configurações** — `TabsList` com `grid-cols-9` fixo: nove abas comprimidas em ~40px cada, texto ilegível.
5. **Tarefa (TaskView)** — o painel de atividade é `hidden lg:flex`, então em mobile/tablet não há como ver atividades/comentários.
6. **Kanban** — modo "encaixar colunas na tela" gera `grid-cols-3..6`; com 5-6 etapas no celular cada coluna fica com poucos pixels.
7. **Lista (ListDetailView)** — `container p-6`, título `text-3xl`, busca com `w-64` fixo e cabeçalho em `flex justify-between`: quebra/estoura em telas estreitas.
8. **Tabela de tarefas (TaskListView)** — tabela larga dentro de `overflow-hidden`, sem rolagem horizontal em mobile.
9. **Diálogos e grids de formulário** — vários `grid-cols-2` sem variante mobile (ex.: datas no criar tarefa) e modais largos sem limite de altura em telas baixas.
10. **Alvos de toque** — muitos botões `size="icon"` com `h-8 w-8`/`h-7` em barras de ação; abaixo do mínimo confortável (~40px) para toque.

## O que será feito (por módulo)

**A. Layout base**
- Trocar alturas fixas por `h-full`/`min-h-0` nas páginas, deixando o scroll no container do layout autenticado.
- Garantir `overflow-x-hidden` na área principal para nada "vazar" lateralmente.
- Padding responsivo padrão: `p-3 md:p-6`, títulos `text-xl md:text-3xl`.

**B. Início**
- Mobile: coluna única com rolagem natural da página (Tarefas, Comentários, Feed empilhados, cada um com altura mínima legível). Desktop mantém o grid 2 colunas + feed com as proporções atuais.

**C. Chat**
- Mobile: sem painéis redimensionáveis — mostra a lista de canais e, ao escolher um canal, a conversa em tela cheia com botão "voltar". Desktop segue idêntico.

**D. Configurações**
- Mobile: abas em faixa rolável horizontal (sem grid fixo), com scroll suave; `lg` mantém o grid de 9 colunas atual.

**E. Tarefa**
- Mobile/tablet: painel de atividade acessível em aba/drawer, sem sumir. Desktop mantém o split 65/35.

**F. Visualizações (Kanban / Lista / Sprint)**
- Kanban: em telas `< md` sempre colunas com largura mínima e rolagem horizontal (ignora o "encaixar na tela"), cabeçalho de coluna com `truncate`.
- Lista: envolver a tabela em wrapper com rolagem horizontal e primeira coluna legível.
- Filtros/ações do cabeçalho: `flex-wrap`, busca `w-full sm:w-64`, seguindo o padrão grid + `min-w-0` + `shrink-0`.

**G. Diálogos e formulários**
- `grid-cols-1 sm:grid-cols-2` nos pares de campos, `max-h-[85dvh] overflow-y-auto` nos conteúdos de modal.

**H. Toque**
- Elevar botões de ação principais para `h-9 md:h-8` e aumentar o espaçamento em barras de ação densas.

## Verificação
Checagem no navegador em 390x844 (celular), 768x1024 (tablet) e 1440x900 (desktop), nas telas: Início, Space, Lista (lista/kanban/sprint), Tarefa, Chat, Documentos, Painéis e Configurações — confirmando ausência de rolagem horizontal indevida, textos não sobrepostos e desktop inalterado.

## Detalhes técnicos
- Apenas classes Tailwind e pequenos ramos condicionais com `useIsMobile()` (já existe em `src/hooks/use-mobile.tsx`) onde a estrutura muda (Chat e painel da Tarefa).
- Nenhuma nova dependência, nenhuma migration, nenhuma alteração em hooks de dados.
- Módulos são editados isoladamente: mexer no Chat não altera Lista/Tarefa.
