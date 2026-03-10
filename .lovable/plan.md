

# Indicador de não lido: texto vermelho e negrito

## Alteração

**Arquivo: `src/components/chat/ChatSidebar.tsx`**

Nos dois locais onde canais não lidos são indicados (space channels na linha 261 e custom channels na linha 307), substituir a bolinha vermelha (`<span className="ml-auto h-2 w-2 rounded-full bg-destructive" />`) por estilização no texto do canal: texto vermelho e negrito.

Concretamente, aplicar `font-bold text-destructive` no `<span>` do nome do canal quando `unreadChannelIds?.includes(channel.id)` for true, e remover os elementos `<span>` da bolinha.

