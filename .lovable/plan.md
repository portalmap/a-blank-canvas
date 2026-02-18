

# Salvar Descrição Apenas ao Sair do Editor

## Problema

Atualmente, o `SimpleRichTextEditor` dispara `onChange` a cada tecla digitada (via `onUpdate` do TipTap), e o `TaskMainContent` salva no banco e registra atividade a cada chamada. Isso gera dezenas de requisições e registros de atividade desnecessários.

## Solução

Separar o fluxo em dois callbacks no `SimpleRichTextEditor`:
- `onChange` (local): chamado a cada tecla, apenas atualiza o estado local
- `onBlur` (novo): chamado quando o editor perde o foco, dispara o salvamento real

### Alteracoes

**1. `src/components/documents/editor/SimpleRichTextEditor.tsx`**

- Adicionar prop `onBlur` opcional ao componente
- Configurar o evento `onBlur` do TipTap para chamar esse callback com o conteudo atual do editor
- Manter `onUpdate`/`onChange` funcionando normalmente para outros usos do componente

**2. `src/components/tasks/TaskMainContent.tsx`**

- Separar `handleDescriptionChange` em duas funcoes:
  - `handleDescriptionLocalChange`: apenas atualiza o estado local (`setEditDescription`)
  - `handleDescriptionSave`: faz o salvamento real no banco e registra a atividade (somente se houve mudanca)
- Passar `handleDescriptionLocalChange` como `onChange` e `handleDescriptionSave` como `onBlur` para o `SimpleRichTextEditor`

### Detalhe Tecnico

No `SimpleRichTextEditor`, o TipTap suporta o evento `onBlur` nativamente:

```text
const editor = useEditor({
  ...
  onBlur: ({ editor }) => {
    const json = JSON.stringify(editor.getJSON());
    onBlur?.(json);
  },
});
```

No `TaskMainContent`:

```text
// Apenas atualiza estado local (sem salvar)
const handleDescriptionLocalChange = (newDescription: string) => {
  setEditDescription(newDescription);
};

// Salva no banco apenas quando perde foco
const handleDescriptionSave = async (currentContent: string) => {
  const oldDescription = task.description || null;
  if (currentContent === oldDescription) return;
  // ... salvar e registrar atividade
};
```

Isso elimina completamente o problema de multiplos salvamentos e registros de atividade durante a digitacao.

