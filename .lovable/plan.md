# Expandir "Onde aplicar" em um modal

## Problema
Hoje o seletor de locais fica numa caixa curta com rolagem (altura fixa de 256px) dentro do card "Aplicar Modelo em Locais". Com muitos spaces/pastas/listas, clicar em setas e caixas de seleção fica apertado e confuso.

## O que será feito
1. Adicionar um botão "Expandir" (ícone de maximizar) ao lado do rótulo "Onde aplicar".
2. Ao clicar, abrir um modal grande (largura ampla, altura ~80% da tela) com a mesma árvore de locais, com mais respiro:
   - linhas mais altas e áreas de clique maiores;
   - campo de busca para filtrar spaces, pastas e listas pelo nome (expandindo automaticamente os nós que contêm resultados);
   - botões "Expandir tudo" / "Recolher tudo";
   - contador de locais selecionados e ação "Limpar seleção";
   - botão "Concluir" que fecha o modal mantendo a seleção.
3. A caixa embutida continua funcionando como hoje (nada é removido), e mostra um resumo do que já está selecionado.
4. A seleção é compartilhada entre a caixa embutida e o modal, então aplicar o modelo funciona igual, sem mudanças na lógica de aplicação.

## Detalhes técnicos
- Arquivo principal: `src/components/settings/StatusApplySection.tsx`.
- Extrair a árvore atual para um componente reutilizável `LocationTree` (novo arquivo `src/components/settings/LocationTree.tsx`), recebendo por props: spaces/folders/lists, estados de seleção e expansão, callbacks de toggle, termo de busca e uma variante de densidade (`compact` | `comfortable`).
- Modal com `Dialog` do shadcn (`@/components/ui/dialog`), conteúdo com `ScrollArea` e `max-h-[80vh]`.
- Estados de seleção/expansão permanecem no `StatusApplySection` (fonte única), passados para os dois usos.
- Sem alterações em hooks, banco de dados ou na mutação `useApplyStatusTemplate`.
