# Barra de notificações "ao vivo" (estilo canal de notícias)

## Como vai funcionar

A faixa fina do topo (desktop) deixa de ter só o sino: ela ganha um letreiro que desliza continuamente da direita para a esquerda, como o rodapé de notícias da TV.

- **Com notificações não lidas:** o letreiro mostra só as não lidas, em loop infinito, com o texto em vermelho (token `destructive`) e um pontinho pulsando antes de cada item. Cada item é clicável: abre a notificação (marca como lida e navega para a tarefa/documento correspondente).
- **Sem não lidas:** aparece uma frase motivacional aleatória, em cor neutra, também deslizando suavemente. A frase é sorteada de uma lista de ~15 mensagens e troca a cada nova sessão/atualização.
- **Detalhes de comportamento:** a animação pausa ao passar o mouse (para dar tempo de ler/clicar), respeita `prefers-reduced-motion` (nesse caso troca de item com fade em vez de rolar), e a velocidade se ajusta ao tamanho do texto para ficar legível.
- O sino continua no mesmo lugar, com o contador e o painel atual intactos.
- O botão claro/escuro sai da faixa (já existe na sidebar, acima de "Sair"). O cabeçalho mobile mantém apenas o sino e o menu; no mobile o letreiro fica escondido para não competir com o espaço.

## Passos

1. Novo componente `src/components/notifications/NotificationTicker.tsx` com o letreiro (marquee duplicado para loop sem emenda), consumindo `useNotificationCenter` (não lidas + ação de abrir).
2. Nova lista de frases em `src/components/notifications/motivationalMessages.ts`.
3. Keyframes/utilitário de marquee em `src/styles.css` usando tokens existentes.
4. `TopBar.tsx`: remove o `ThemeToggle`, coloca o letreiro ocupando a largura livre à esquerda e o sino à direita, dentro de `SafeBoundary`.
5. `MobileHeader.tsx`: remove o `ThemeToggle` para manter coerência.
6. Verificação no navegador: com não lidas (texto vermelho em loop) e sem não lidas (frase motivacional).

## Detalhes técnicos

- Sem mudanças de banco de dados nem em `useNotifications.ts`; o letreiro só lê o estado já exposto por `useNotificationCenter`.
- Animação em CSS puro (`transform: translateX`) para não pesar; nenhuma dependência nova.
- Cores via tokens do design system (`text-destructive`, `text-muted-foreground`), sem cor fixa.
