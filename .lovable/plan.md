
## Plano: Adicionar Menu Flutuante de Edição na Descrição de Tarefas

### Problema Identificado

O menu flutuante de edição de texto (Bubble Menu) foi implementado apenas no `RichTextEditor`, que é usado exclusivamente na página de **Documentos**. Os campos de descrição de tarefas utilizam o componente `Textarea` padrão, que não suporta formatação de texto ou menus flutuantes.

### Locais Afetados

| Componente | Uso Atual | Local |
|------------|-----------|-------|
| `TaskMainContent.tsx` | `Textarea` | Descrição de tarefas (drawer lateral) |
| `TemplateTaskDialog.tsx` | `Textarea` | Descrição de tarefas em templates |

### Solução Proposta

Substituir o `Textarea` pelo `RichTextEditor` nos campos de descrição, permitindo que o menu flutuante apareça ao selecionar texto.

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/tasks/TaskMainContent.tsx` | Substituir `Textarea` por `RichTextEditor` no campo de descrição |
| `src/components/settings/TemplateTaskDialog.tsx` | Substituir `Textarea` por `RichTextEditor` no campo de descrição |

---

### Implementação

#### 1. TaskMainContent.tsx

**Mudanças:**
- Importar `RichTextEditor` do módulo de editor
- Substituir o `Textarea` pelo `RichTextEditor`
- Ajustar a lógica de edição para trabalhar com conteúdo JSON do TipTap

```typescript
// Adicionar import
import { RichTextEditor } from '@/components/documents/editor';

// No estado de edição de descrição (isEditingDescription === true):
<RichTextEditor
  content={editDescription}
  onChange={setEditDescription}
  placeholder="Adicione uma descrição..."
/>

// Na visualização (isEditingDescription === false):
// Manter o RichTextEditor mas com disabled={true} para exibir o conteúdo formatado
```

**Considerações:**
- O `RichTextEditor` já inclui o `EditorBubbleMenu` automaticamente
- O conteúdo será salvo em formato JSON do TipTap (não mais texto plano)
- A função `renderTextWithImagesAndLinks` pode precisar de ajuste para renderizar conteúdo TipTap

#### 2. TemplateTaskDialog.tsx

**Mudanças:**
- Importar `RichTextEditor`
- Substituir os dois `Textarea` (inline e expandido) por `RichTextEditor`
- Remover o diálogo de expansão separado (o RichTextEditor já tem boa UX)

```typescript
// Adicionar import
import { RichTextEditor } from '@/components/documents/editor';

// Substituir o Textarea:
<RichTextEditor
  content={description}
  onChange={setDescription}
  placeholder="Adicione uma descrição..."
/>
```

---

### Migração de Dados

**Importante:** O `RichTextEditor` usa formato JSON do TipTap, enquanto as descrições atuais são texto plano.

O `RichTextEditor` já possui a função `parseContent()` que:
1. Detecta se o conteúdo é JSON do TipTap
2. Converte texto plano para formato TipTap automaticamente
3. Mantém compatibilidade com dados antigos

Isso significa que descrições existentes continuarão funcionando sem necessidade de migração de banco de dados.

---

### Ajustes de UI

Para manter consistência visual:

1. **Remover toolbar duplicada**: O `RichTextEditor` tem uma toolbar no topo, mas para descrições de tarefas podemos simplificar e manter apenas o Bubble Menu

2. **Criar versão simplificada**: Criar um componente `SimpleRichTextEditor` que:
   - Não mostra a toolbar superior
   - Não mostra o botão de adicionar bloco
   - Mostra apenas o Bubble Menu ao selecionar texto
   - Mantém o placeholder

```typescript
// Nova versão simplificada para descrições
export const SimpleRichTextEditor = ({ content, onChange, placeholder, disabled }) => {
  // Mesma lógica do RichTextEditor mas sem:
  // - EditorToolbar
  // - AddBlockButton
  // - SlashCommandMenu (opcional, pode manter)
  
  return (
    <div className="simple-rich-text-editor">
      <EditorBubbleMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
```

---

### Resultado Esperado

1. Ao selecionar texto na descrição de qualquer tarefa, o menu flutuante aparecerá
2. O usuário poderá formatar texto com negrito, itálico, sublinhado, cores, etc.
3. Compatibilidade total com descrições existentes (texto plano)
4. Interface limpa sem elementos desnecessários

---

### Passos de Implementação

1. **Criar `SimpleRichTextEditor`**: Versão enxuta do editor apenas com Bubble Menu
2. **Atualizar `TaskMainContent`**: Usar o novo editor para descrições
3. **Atualizar `TemplateTaskDialog`**: Usar o novo editor para descrições
4. **Testar compatibilidade**: Verificar que descrições antigas aparecem corretamente
5. **Ajustar estilos**: Garantir que o editor se integre visualmente aos dialogs
