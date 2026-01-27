

## Plano: Bubble Menu de Edição Simples (Estilo ClickUp)

### Visão Geral

Implementar um menu flutuante que aparece ao selecionar texto, permitindo edição rápida similar ao ClickUp. O menu aparecerá acima do texto selecionado com opções de formatação.

---

### Interface Visual Proposta (baseada nas imagens de referência)

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  [Texto ▼]  │ A │ B │ I │ U │ S̶ │ </> │ ≡ ▼ │ 🔗 │ ⋯ │                               │
└─────────────────────────────────────────────────────────────────────────────────────┘
      │         │   │   │   │   │    │    │    │   │
      │         │   │   │   │   │    │    │    │   └── Menu extras (Desfazer, Limpar formato)
      │         │   │   │   │   │    │    │    └────── Link
      │         │   │   │   │   │    │    └─────────── Alinhamento
      │         │   │   │   │   │    └──────────────── Código inline
      │         │   │   │   │   └───────────────────── Tachado
      │         │   │   │   └────────────────────────── Sublinhado (NOVO)
      │         │   │   └─────────────────────────────── Itálico
      │         │   └──────────────────────────────────── Negrito
      │         └──────────────────────────────────────────Cor do texto
      └───────────────────────────────────────────────────── Tipo de bloco (dropdown)
```

---

### Funcionalidades

| Botão | Função | Atalho |
|-------|--------|--------|
| **Texto ▼** | Dropdown para transformar em Texto, Cabeçalho 1-4, Bloco de código, Citação | - |
| **A** | Cor do texto (paleta de cores) | - |
| **B** | Negrito | Ctrl+B |
| **I** | Itálico | Ctrl+I |
| **U** | Sublinhado (novo) | Ctrl+U |
| **S̶** | Tachado | Ctrl+Shift+S |
| **</>** | Código inline | Ctrl+E |
| **≡ ▼** | Alinhamento (esquerda, centro, direita, recuo) | - |
| **🔗** | Inserir/editar link | Ctrl+K |
| **⋯** | Menu extras (Desfazer, Refazer, Limpar formato, Copiar markdown) | - |

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/documents/editor/EditorBubbleMenu.tsx` | **CRIAR** - Novo componente do bubble menu |
| `src/components/documents/editor/RichTextEditor.tsx` | **MODIFICAR** - Integrar BubbleMenu, adicionar extensão Underline |
| `src/components/documents/editor/editor-styles.css` | **MODIFICAR** - Adicionar estilos do bubble menu |
| `src/components/documents/editor/index.ts` | **MODIFICAR** - Exportar novo componente |

---

### Implementação

#### 1. Novo Componente: EditorBubbleMenu.tsx

```typescript
// Imports
import { BubbleMenu } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import { 
  Bold, Italic, Underline, Strikethrough, Code, Link, 
  AlignLeft, AlignCenter, AlignRight, Type, ChevronDown,
  MoreHorizontal, Undo, Redo, RemoveFormatting,
  Heading1, Heading2, Heading3, Heading4, Quote, Code2
} from 'lucide-react';
// + UI components (Button, Popover, DropdownMenu, etc.)

interface EditorBubbleMenuProps {
  editor: Editor;
}

export const EditorBubbleMenu = ({ editor }: EditorBubbleMenuProps) => {
  // Estado para link input, cor selecionada, etc.
  
  return (
    <BubbleMenu 
      editor={editor} 
      tippyOptions={{ duration: 150 }}
      className="bubble-menu"
    >
      {/* Container compacto horizontal */}
      <div className="flex items-center gap-0.5 p-1 bg-popover border rounded-lg shadow-lg">
        
        {/* 1. Tipo de Bloco (dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
              <Type className="h-3.5 w-3.5" />
              <span>Texto</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
              <Type className="h-4 w-4 mr-2" />
              Texto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="h-4 w-4 mr-2" />
              Cabeçalho 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="h-4 w-4 mr-2" />
              Cabeçalho 2
            </DropdownMenuItem>
            {/* ... mais opções */}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5" />

        {/* 2. Cor do Texto */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <span className="font-bold text-sm">A</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <ColorPicker 
              onColorSelect={(color) => editor.chain().focus().setColor(color).run()}
              label="Cor do texto"
            />
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-5" />

        {/* 3. Formatação básica: B, I, U, S, Code */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-7 w-7 p-0 ${editor.isActive('bold') ? 'bg-accent' : ''}`}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-7 w-7 p-0 ${editor.isActive('italic') ? 'bg-accent' : ''}`}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`h-7 w-7 p-0 ${editor.isActive('underline') ? 'bg-accent' : ''}`}
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`h-7 w-7 p-0 ${editor.isActive('strike') ? 'bg-accent' : ''}`}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`h-7 w-7 p-0 ${editor.isActive('code') ? 'bg-accent' : ''}`}
        >
          <Code className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5" />

        {/* 4. Alinhamento (dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-1.5">
              <AlignLeft className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <AlignLeft className="h-4 w-4 mr-2" />
              Alinhar à esquerda
            </DropdownMenuItem>
            <DropdownMenuItem>
              <AlignCenter className="h-4 w-4 mr-2" />
              Alinhar no centro
            </DropdownMenuItem>
            <DropdownMenuItem>
              <AlignRight className="h-4 w-4 mr-2" />
              Alinhar à direita
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5" />

        {/* 5. Link */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${editor.isActive('link') ? 'bg-accent' : ''}`}
            >
              <Link className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            {/* Input de URL + botões Aplicar/Remover */}
          </PopoverContent>
        </Popover>

        {/* 6. Menu extras */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => editor.chain().focus().undo().run()}>
              <Undo className="h-4 w-4 mr-2" />
              Desfazer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().redo().run()}>
              <Redo className="h-4 w-4 mr-2" />
              Refazer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetAllMarks().run()}>
              <RemoveFormatting className="h-4 w-4 mr-2" />
              Limpar formato
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </BubbleMenu>
  );
};
```

#### 2. Modificar RichTextEditor.tsx

- Remover a configuração da extensão `BubbleMenu` no array de extensions (usar o componente React)
- Adicionar a extensão `Underline` do TipTap
- Importar e renderizar `<EditorBubbleMenu editor={editor} />` dentro do JSX

```typescript
// Adicionar imports
import Underline from '@tiptap/extension-underline';
import { EditorBubbleMenu } from './EditorBubbleMenu';

// No array de extensions, adicionar:
Underline,

// Remover BubbleMenu.configure({...}) do extensions array

// No return JSX, adicionar:
{editor && <EditorBubbleMenu editor={editor} />}
```

#### 3. Estilos CSS para Bubble Menu

```css
/* Bubble Menu */
.bubble-menu {
  z-index: 50;
}

.bubble-menu .tippy-content {
  padding: 0;
}
```

---

### Comportamento

1. **Aparece**: Quando o usuário seleciona qualquer texto no editor
2. **Desaparece**: Quando a seleção é desfeita ou o cursor sai do texto
3. **Posição**: Acima do texto selecionado (com fallback para baixo se não houver espaço)
4. **Animação**: Fade-in suave de 150ms

---

### Dependências

A extensão `@tiptap/extension-underline` já está instalada no projeto (`node_modules/@tiptap/extension-underline` existe), mas não está listada no `package.json`. Vou usar a extensão existente.

---

### Resultado Final

O usuário terá:
1. Um menu flutuante compacto estilo ClickUp ao selecionar texto
2. Acesso rápido a todas as formatações de texto
3. Dropdown para transformar tipo de bloco (Texto, Cabeçalhos, etc.)
4. Seletor de cores para o texto
5. Botão de sublinhado (novo)
6. Opções de alinhamento
7. Inserção de links
8. Menu extras com Desfazer/Refazer e Limpar formato

