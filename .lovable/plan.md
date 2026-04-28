## Compactar criação de post no Feed

Hoje o card do Feed mostra uma barra grande "Nova publicação..." que ocupa bastante espaço acima da lista. Vou substituí-la por um botão pequeno alinhado ao cabeçalho/filtros, liberando o espaço para os posts.

### Mudanças

**1. `src/components/home/CreatePostDialog.tsx`**
- Adicionar prop opcional `triggerVariant?: 'bar' | 'compact'` (padrão `'bar'` para preservar uso atual em outras telas/dialog).
- Quando `'compact'`, renderizar apenas um `Button` pequeno (ícone `Plus` + texto "Publicar"), em vez da barra com avatar e placeholder.

**2. `src/components/home/FeedCard.tsx`**
- Remover o bloco grande do `CreatePostDialog` que aparece acima dos filtros (tanto no card quanto no dialog expandido).
- Mover o trigger para dentro do componente `Filters`, ao lado do botão de busca, usando `triggerVariant="compact"`.
- Resultado: cabeçalho fica em uma única linha (Tabs Recentes/Fixados/Meus + busca + botão "Publicar"), e a `ScrollArea` dos posts ganha toda a altura que era ocupada pela barra.

### Notas
- O dialog em si (formulário de publicação) não muda — só o trigger que abre.
- Usuários sem permissão (`canCreatePost === false`) continuam não vendo o botão.
- Nenhuma mudança de backend.