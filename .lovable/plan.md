

# Tornar a secao do Workspace recolhivel no sidebar

## Problema

Atualmente, o workspace e todos os seus spaces ficam sempre expandidos no sidebar, empurrando os botoes de "Configuracoes", "Modo Claro/Escuro" e "Sair" para baixo, exigindo rolagem.

## Solucao

Transformar a secao do workspace em um componente recolhivel (collapsible), exatamente como os spaces ja funcionam -- com uma seta de expansao que esconde/mostra a lista de spaces.

## Alteracao

### Arquivo: `src/components/AppSidebar.tsx`

Usar o componente `Collapsible` (ja importado no projeto via `@/components/ui/collapsible`) para envolver a area do workspace:

1. Importar `Collapsible`, `CollapsibleContent` e `CollapsibleTrigger`
2. Importar o icone `ChevronRight` do lucide-react
3. Adicionar um estado `workspaceOpen` para controlar a expansao (default: `true`)
4. Envolver a linha do workspace + a lista de spaces com `Collapsible`
5. Colocar a seta de expansao (`ChevronRight`) ao lado do nome do workspace, igual aos spaces
6. Colocar a lista de spaces dentro do `CollapsibleContent`

### Resultado visual:

```text
Antes (sempre aberto):                 Depois (recolhivel):

  Principal                              Principal
  [Home] Operacional MAP  [troca]        > [Home] Operacional MAP  [troca]   <-- clica para recolher
    > MAP | Accerth                       (spaces escondidos quando recolhido)
    > MAP | Outro Space
    > ...                                 Configuracoes   <-- visivel sem rolar
  (precisa rolar para ver abaixo)         Modo Claro
  Configuracoes                           Sair
  Modo Claro
  Sair
```

### Detalhes tecnicos

- O `ChevronRight` rotaciona 90 graus quando aberto (mesmo padrao do `SpaceTreeItem`)
- O botao de "Trocar Workspace" (`ArrowLeftRight`) permanece visivel mesmo quando recolhido
- O estado inicia como `true` (aberto) por padrao para manter o comportamento atual na primeira carga
- Nenhuma alteracao de banco de dados necessaria

