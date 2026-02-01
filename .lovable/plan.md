

## Plano: Corrigir Persistência da Atribuição Automática

### Diagnóstico do Problema

Analisando o banco de dados, confirmei que as automações **estão sendo salvas corretamente** com `user_ids: [array]`. O problema é de **compatibilidade retroativa**:

1. Automações antigas foram salvas com `user_id: "string"` (singular)
2. O novo código espera `user_ids: ["array"]` (plural)
3. Quando uma automação antiga é aberta para edição, `config.user_ids` é `undefined`, então o componente mostra vazio

**Evidência do banco de dados:**
- Automações novas: `action_config: {user_ids: [id1, id2, id3]}`
- Automações antigas: `action_config: {user_id: "id1"}`

---

### Correção Necessária

Adicionar lógica de compatibilidade retroativa no `ActionConfigForm.tsx` para que, ao renderizar campos do tipo `users`, ele também verifique o campo `user_id` legado e converta automaticamente.

---

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/automations/advanced/ActionConfigForm.tsx` | Adicionar compatibilidade retroativa no case `users` |

---

### Seção Técnica

#### Antes (linha 270 aproximadamente):
```tsx
case 'users':
  return (
    <UserMultiSelect
      key={field.name}
      label={field.label}
      users={members?.map(m => ({...})) || []}
      selectedIds={config[field.name] || []}  // ← Problema aqui
      onSelectionChange={(ids) => handleFieldChange(field.name, ids)}
      required={field.required}
    />
  );
```

#### Depois (com compatibilidade retroativa):
```tsx
case 'users':
  // Compatibilidade retroativa: converte user_id (string) para user_ids (array)
  const legacyFieldName = field.name === 'user_ids' ? 'user_id' : undefined;
  const currentValue = config[field.name];
  const legacyValue = legacyFieldName ? config[legacyFieldName] : undefined;
  
  // Se não há valor no novo campo, tenta converter do campo legado
  const selectedUserIds = currentValue 
    || (legacyValue ? [legacyValue] : []);
  
  return (
    <UserMultiSelect
      key={field.name}
      label={field.label}
      users={members?.map(m => ({
        id: m.user_id,
        full_name: m.profile?.full_name || null,
        avatar_url: m.profile?.avatar_url || null
      })) || []}
      selectedIds={selectedUserIds}
      onSelectionChange={(ids) => handleFieldChange(field.name, ids)}
      required={field.required}
    />
  );
```

---

### Comportamento Esperado Após Correção

1. Ao abrir para edição uma automação **antiga** com `user_id: "abc"`:
   - Sistema detecta que `user_ids` não existe
   - Busca valor em `user_id` e converte para `["abc"]`
   - Usuário vê o selecionado corretamente

2. Ao abrir para edição uma automação **nova** com `user_ids: ["abc", "def"]`:
   - Sistema usa `user_ids` diretamente
   - Usuário vê todos os selecionados

3. Ao salvar qualquer edição:
   - Sempre grava como `user_ids: [array]`
   - Migração implícita para o novo formato

---

### Resultado

- Automações antigas continuam funcionando e podem ser editadas
- Ao editar e salvar, são automaticamente migradas para o novo formato
- Novas automações usam o formato correto desde o início

