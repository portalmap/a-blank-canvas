
# Editar Nome e Excluir Canais — Admins e Proprietários

## Situação Atual

- A sidebar do chat já tem um menu de 3 pontos nos canais **personalizados** com opção de excluir
- Canais de **Space** e **DMs** não têm menu de ações
- Não existe função de **renomear** canal em nenhum lugar
- Não existe hook `useUpdateChannel` no código

## O que será feito

### 1. Novo hook: `useUpdateChannel` em `useChat.ts`
- Mutation que faz `UPDATE` em `chat_channels` alterando o campo `name`

### 2. Editar `ChatSidebar.tsx`
- Adicionar menu de 3 pontos nos canais de **Space** e **DMs** (para admins/proprietários)
- Adicionar opção **"Renomear"** no dropdown (abre input inline ou dialog simples)
- Adicionar opção **"Excluir"** nos canais de Space e DMs (atualmente só existe em personalizados)
- Manter a lógica existente: membros comuns só podem excluir canais que criaram; admins/proprietários podem tudo

### 3. Dialog de renomear canal
- Input simples com o nome atual preenchido
- Botões "Cancelar" e "Salvar"
- Reutiliza o padrão de AlertDialog já presente no componente

## Permissões

- **Renomear**: apenas admins, proprietários e global owners
- **Excluir**: admins/proprietários podem excluir qualquer canal; membros podem excluir canais que criaram (regra já existente)
- Canais de Space: o nome é sincronizado com o Space, então renomear será desabilitado para eles (renomear o Space já atualiza o canal)

## Arquivos

- 1 editado: `src/hooks/useChat.ts` (adicionar `useUpdateChannel`)
- 1 editado: `src/components/chat/ChatSidebar.tsx` (menu de ações em todos os tipos de canal + dialog de renomear)
- 0 migrations (a RLS de UPDATE em `chat_channels` já deve permitir para admins)
