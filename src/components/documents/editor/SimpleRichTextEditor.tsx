import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect } from 'react';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CollapsibleHeading } from './extensions';
import './editor-styles.css';

interface SimpleRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export const SimpleRichTextEditor = ({ 
  content, 
  onChange, 
  disabled = false,
  placeholder = "Adicione uma descrição...",
  className = "",
  minHeight = "80px"
}: SimpleRichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      CollapsibleHeading.configure({
        levels: [1, 2, 3, 4],
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: parseContent(content),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      onChange(json);
    },
  });

  useEffect(() => {
    if (editor && disabled !== !editor.isEditable) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = parseContent(content);
      const newContentStr = JSON.stringify(newContent);
      
      if (currentContent !== newContentStr) {
        editor.commands.setContent(newContent);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={`simple-rich-text-editor border rounded-md ${className}`}>
        <EditorBubbleMenu editor={editor} />
        <EditorContent 
          editor={editor} 
          className="prose prose-sm dark:prose-invert max-w-none p-3"
          style={{ minHeight }}
        />
      </div>
    </TooltipProvider>
  );
};

function parseContent(content: string): any {
  if (!content) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
  
  try {
    const parsed = JSON.parse(content);
    // Check if it's TipTap format
    if (parsed.type === 'doc') {
      return parsed;
    }
    // Legacy format { text: string }
    if (parsed.text !== undefined) {
      return {
        type: 'doc',
        content: parsed.text.split('\n').map((line: string) => ({
          type: 'paragraph',
          content: line ? [{ type: 'text', text: line }] : [],
        })),
      };
    }
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  } catch {
    // Plain text fallback
    return {
      type: 'doc',
      content: content.split('\n').map((line: string) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      })),
    };
  }
}
