import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import AutoJoiner from 'tiptap-extension-auto-joiner';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useEffect } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { SlashCommandMenu } from './SlashCommandMenu';
import { AddBlockButton } from './AddBlockButton';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CollapsibleHeading } from './extensions';
import './editor-styles.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const RichTextEditor = ({ 
  content, 
  onChange, 
  disabled = false,
  placeholder = "Comece a escrever ou digite / para comandos..."
}: RichTextEditorProps) => {
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
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      AutoJoiner.configure({
        elementsToJoin: ['bulletList', 'orderedList'],
      }),
      GlobalDragHandle.configure({
        dragHandleWidth: 24,
        scrollTreshold: 100,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
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
      <div className="rich-text-editor">
        <EditorToolbar editor={editor} />
        <SlashCommandMenu editor={editor} />
        <EditorBubbleMenu editor={editor} />
        <div className="editor-content-wrapper">
          {!disabled && <AddBlockButton editor={editor} />}
          <EditorContent editor={editor} className="prose prose-lg dark:prose-invert max-w-none" />
        </div>
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
