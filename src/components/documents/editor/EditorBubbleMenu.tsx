import { BubbleMenu } from '@tiptap/react/menus';
import { Editor } from '@tiptap/core';
import { useState } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, Code, Link2, 
  AlignLeft, AlignCenter, AlignRight, Type, ChevronDown,
  MoreHorizontal, Undo, Redo, RemoveFormatting,
  Heading1, Heading2, Heading3, Heading4, Quote, Code2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ColorPicker } from './ColorPicker';

interface EditorBubbleMenuProps {
  editor: Editor;
}

export const EditorBubbleMenu = ({ editor }: EditorBubbleMenuProps) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

  const getCurrentBlockLabel = () => {
    if (editor.isActive('heading', { level: 1 })) return 'Título 1';
    if (editor.isActive('heading', { level: 2 })) return 'Título 2';
    if (editor.isActive('heading', { level: 3 })) return 'Título 3';
    if (editor.isActive('heading', { level: 4 })) return 'Título 4';
    if (editor.isActive('codeBlock')) return 'Código';
    if (editor.isActive('blockquote')) return 'Citação';
    return 'Texto';
  };

  const handleSetLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setIsLinkPopoverOpen(false);
    setLinkUrl('');
  };

  const handleRemoveLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setIsLinkPopoverOpen(false);
    setLinkUrl('');
  };

  const openLinkPopover = () => {
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setIsLinkPopoverOpen(true);
  };

  return (
    <BubbleMenu 
      editor={editor} 
      options={{ 
        placement: 'top',
      }}
      className="bubble-menu"
    >
      <div className="flex items-center gap-0.5 p-1 bg-popover border border-border rounded-lg shadow-lg">
        {/* 1. Tipo de Bloco (dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
              <Type className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{getCurrentBlockLabel()}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover">
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
              <Type className="h-4 w-4 mr-2" />
              Texto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="h-4 w-4 mr-2" />
              Título 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="h-4 w-4 mr-2" />
              Título 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="h-4 w-4 mr-2" />
              Título 3
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
              <Heading4 className="h-4 w-4 mr-2" />
              Título 4
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              <Code2 className="h-4 w-4 mr-2" />
              Bloco de código
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="h-4 w-4 mr-2" />
              Citação
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* 2. Cor do Texto */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <span className="font-bold text-sm">A</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-popover" align="start">
            <ColorPicker 
              onColorSelect={(color) => {
                if (color === 'inherit') {
                  editor.chain().focus().unsetColor().run();
                } else {
                  editor.chain().focus().setColor(color).run();
                }
              }}
              label="Cor do texto"
            />
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* 3. Formatação básica: B, I, U, S, Code */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-7 w-7 p-0 ${editor.isActive('bold') ? 'bg-accent' : ''}`}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-7 w-7 p-0 ${editor.isActive('italic') ? 'bg-accent' : ''}`}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`h-7 w-7 p-0 ${editor.isActive('underline') ? 'bg-accent' : ''}`}
          title="Sublinhado (Ctrl+U)"
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`h-7 w-7 p-0 ${editor.isActive('strike') ? 'bg-accent' : ''}`}
          title="Tachado"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`h-7 w-7 p-0 ${editor.isActive('code') ? 'bg-accent' : ''}`}
          title="Código inline (Ctrl+E)"
        >
          <Code className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* 4. Alinhamento (dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-1.5">
              <AlignLeft className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover">
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('left').run()}>
              <AlignLeft className="h-4 w-4 mr-2" />
              Alinhar à esquerda
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('center').run()}>
              <AlignCenter className="h-4 w-4 mr-2" />
              Alinhar no centro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('right').run()}>
              <AlignRight className="h-4 w-4 mr-2" />
              Alinhar à direita
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* 5. Link */}
        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={openLinkPopover}
              className={`h-7 w-7 p-0 ${editor.isActive('link') ? 'bg-accent' : ''}`}
              title="Inserir link (Ctrl+K)"
            >
              <Link2 className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 bg-popover" align="start">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">URL do link</label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://exemplo.com"
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSetLink();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSetLink}
                  className="flex-1 h-8"
                >
                  Aplicar
                </Button>
                {editor.isActive('link') && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleRemoveLink}
                    className="h-8"
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 6. Menu extras */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="h-4 w-4 mr-2" />
              Desfazer
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
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
