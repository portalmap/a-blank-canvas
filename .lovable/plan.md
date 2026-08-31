# Corrigir abertura/edição dos Painéis

## O que está acontecendo

Ao clicar em um painel, a URL muda para `/dashboards/<id>`, mas a tela continua sendo a lista "Todos os Painéis" — nunca abre o painel, então também não dá para editar cards nem renomear.

Causa confirmada no código: `src/routes/_authenticated/dashboards.tsx` virou rota **pai** de `dashboards.$id.tsx` (a árvore gerada mostra `DashboardsRouteWithChildren`), mas o componente dessa rota pai renderiza a página de lista e **não renderiza `<Outlet />`**. Sem o `Outlet`, a rota filha `/dashboards/$id` nunca é montada.

O mesmo padrão existe em `documents.tsx` + `documents.$id.tsx`, então abrir um documento tem o mesmo defeito.

O banco está ok: as políticas de RLS de `dashboards` permitem ver/atualizar/excluir para membros e admins do workspace. Não é problema de permissão.

## O que será feito

1. `src/routes/_authenticated/dashboards.tsx` passa a ser apenas layout: renderiza `<Outlet />`.
2. Novo `src/routes/_authenticated/dashboards.index.tsx` com o conteúdo atual (lista de painéis, protegida por `GuestBlockedRoute`) para `/dashboards`.
3. Mesma correção para documentos: `documents.tsx` vira layout com `<Outlet />` e nasce `documents.index.tsx` com a página de lista.
4. Verificação no navegador: abrir um painel, renomear, adicionar/remover card e voltar para a lista; abrir um documento.

## Detalhes técnicos

- Nada muda em `useDashboards.ts`, `DashboardView.tsx` ou `DashboardsTable.tsx` — a navegação já usa o caminho correto.
- `src/routeTree.gen.ts` é regenerado automaticamente; não será editado à mão.
- Sem alterações de banco de dados.
