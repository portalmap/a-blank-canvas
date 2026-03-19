

# Correções no Chat: Data de criação e atribuição resolvida

## Alterações no arquivo `src/components/chat/ChatMessageItem.tsx`

### 1. Adicionar data de criação junto ao horário (linha 136)

Atualmente exibe apenas `HH:mm`. Alterar o formato para incluir a data:
```typescript
{format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
```

### 2. Manter nome do atribuído quando resolvido (linhas 214-220)

Atualmente, quando resolvido, mostra apenas "(resolvido)" sem indicar para quem foi atribuído. Alterar para mostrar ambas as informações:

```tsx
{isResolved && (
  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
    <UserPlus className="h-3 w-3" />
    <span>Atribuído a: {getAssigneeName()}</span>
    <Check className="h-3 w-3 ml-1" />
    <span>(resolvido)</span>
  </div>
)}
```

Duas mudanças simples, ambas no mesmo arquivo.

