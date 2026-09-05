# Plano: botão de tela cheia na Agenda

## Objetivo
Adicionar, ao lado do rótulo de período da Agenda, um botão que amplie a agenda para tela cheia e permita retornar ao modo normal.

## Escopo
Apenas a página `Agenda` e um novo hook reutilizável. Nenhuma alteração em sincronização, banco de dados, convites ou outros módulos.

## Alterações

### 1. Hook `useFullscreen`
- Criar `src/hooks/useFullscreen.ts`.
- Usar a Fullscreen API (`requestFullscreen`, `exitFullscreen`, `fullscreenchange`).
- Expor estado `isFullscreen`, funções `enter`, `exit`, `toggle` e ref para o elemento.
- Tratar variáveis de vendor (`webkitRequestFullscreen`, `msRequestFullscreen`) de forma segura.
- Escutar evento `fullscreenchange` para sincronizar estado.

### 2. Página `src/page-views/Agenda.tsx`
- Importar `useFullscreen` e ícones `Maximize2` / `Minimize2` do `lucide-react`.
- Envolver o conteúdo da agenda em uma `div` ref que será o elemento de tela cheia.
- Adicionar botão ao lado do `periodLabel` (na mesma linha dos controles de navegação) com:
  - `variant="outline"`, `size="icon"`, altura `h-8 w-8`.
  - Ícone e `aria-label` alternando entre "Expandir tela cheia" e "Sair da tela cheia".
  - `onClick={toggle}`.
- Quando `isFullscreen` for true:
  - Remover padding do container (`p-0`).
  - Aplicar classes para ocupar toda a viewport (`h-screen w-screen overflow-hidden`).
  - Manter visíveis: cabeçalho interno da agenda (título, botões de view, navegação), o calendário e o diálogo de evento.
- Quando `isFullscreen` for false, manter o layout atual (`container mx-auto p-3 md:p-6`).

### 3. Ajustes visuais
- Garantir que `AgendaMonthView`, `AgendaWeekView` e `AgendaListView` se estiquem para preencher a altura disponível em tela cheia sem quebras.
- Manter responsividade em telas menores: o botão deve permanecer acessível.

### 4. Validação
- Executar `bunx tsgo --noEmit` para garantir tipagem.
- Verificar preview em `/agenda`:
  - Botão aparece ao lado do período.
  - Clique expande para tela cheia.
  - Clique novamente ou ESC retorna ao normal.
  - Navegação entre mês/semana/dia continua funcionando em tela cheia.

## Não inclui
- Alterações no layout global `_authenticated/route.tsx` (topbar/sidebar). O fullscreen será aplicado ao elemento da própria página, o que já oculta o restante da aplicação.
- Persistência de preferência de tela cheia.
