import { Editor } from '@tiptap/react';
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  Heading4,
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  Code, 
  Minus,
  Table2,
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

interface SlashCommandMenuProps {
  editor: Editor;
}

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>;
  category: string;
}

const COMMANDS: CommandItem[] = [
  {
    title: 'Cabeçalho 1',
    description: 'Título grande',
    icon: <Heading1 className="h-4 w-4" />,
    command: (chain) => chain.toggleHeading({ level: 1 }),
    category: 'TEXTO',
  },
  {
    title: 'Cabeçalho 2',
    description: 'Título médio',
    icon: <Heading2 className="h-4 w-4" />,
    command: (chain) => chain.toggleHeading({ level: 2 }),
    category: 'TEXTO',
  },
  {
    title: 'Cabeçalho 3',
    description: 'Título pequeno',
    icon: <Heading3 className="h-4 w-4" />,
    command: (chain) => chain.toggleHeading({ level: 3 }),
    category: 'TEXTO',
  },
  {
    title: 'Cabeçalho 4',
    description: 'Título menor',
    icon: <Heading4 className="h-4 w-4" />,
    command: (chain) => chain.toggleHeading({ level: 4 }),
    category: 'TEXTO',
  },
  {
    title: 'Lista com marcadores',
    description: 'Lista simples',
    icon: <List className="h-4 w-4" />,
    command: (chain) => chain.toggleBulletList(),
    category: 'LISTAS',
  },
  {
    title: 'Lista numerada',
    description: 'Lista ordenada',
    icon: <ListOrdered className="h-4 w-4" />,
    command: (chain) => chain.toggleOrderedList(),
    category: 'LISTAS',
  },
  {
    title: 'Checklist',
    description: 'Lista de tarefas',
    icon: <CheckSquare className="h-4 w-4" />,
    command: (chain) => chain.toggleTaskList(),
    category: 'LISTAS',
  },
  {
    title: 'Citação',
    description: 'Bloco de citação',
    icon: <Quote className="h-4 w-4" />,
    command: (chain) => chain.toggleBlockquote(),
    category: 'BLOCOS',
  },
  {
    title: 'Código',
    description: 'Bloco de código',
    icon: <Code className="h-4 w-4" />,
    command: (chain) => chain.toggleCodeBlock(),
    category: 'BLOCOS',
  },
  {
    title: 'Divisor',
    description: 'Linha horizontal',
    icon: <Minus className="h-4 w-4" />,
    command: (chain) => chain.setHorizontalRule(),
    category: 'BLOCOS',
  },
  {
    title: 'Tabela',
    description: 'Inserir tabela 3x2',
    icon: <Table2 className="h-4 w-4" />,
    command: (chain) => chain.insertTable({ rows: 3, cols: 2, withHeaderRow: true }),
    category: 'BLOCOS',
  },
];

export const SlashCommandMenu = ({ editor }: SlashCommandMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const slashPosRef = useRef<number | null>(null);

  const filteredCommands = COMMANDS.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const executeCommand = useCallback((command: CommandItem) => {
    const { from } = editor.state.selection;
    
    // Create chain and delete slash command text first
    let chain = editor.chain().focus();
    
    if (slashPosRef.current !== null) {
      chain = chain.deleteRange({ from: slashPosRef.current, to: from });
    }
    
    // Execute the command in the same transaction and run
    command.command(chain).run();
    
    setIsOpen(false);
    setQuery('');
    slashPosRef.current = null;
  }, [editor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
      } else if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        slashPosRef.current = null;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, executeCommand]);

  useEffect(() => {
    const handleUpdate = () => {
      const { from, empty, $from } = editor.state.selection;
      
      if (!empty) {
        setIsOpen(false);
        return;
      }

      // Use $from.parent to get current block's text content
      const currentNode = $from.parent;
      const textContent = currentNode.textContent;
      const cursorOffset = $from.parentOffset;
      
      // Text before cursor within the current block
      const textBeforeCursor = textContent.slice(0, cursorOffset);
      
      // Find "/" in text before cursor
      const slashIndex = textBeforeCursor.lastIndexOf('/');
      
      if (slashIndex !== -1) {
        // Check if "/" is at start of block OR after a space
        const charBeforeSlash = textBeforeCursor[slashIndex - 1];
        if (slashIndex === 0 || charBeforeSlash === ' ') {
          const searchQuery = textBeforeCursor.slice(slashIndex + 1);
          setQuery(searchQuery);
          setSelectedIndex(0);
          
          // Calculate absolute position of "/" in the document
          const blockStart = $from.start();
          slashPosRef.current = blockStart + slashIndex;
          
          // Get cursor position for menu placement
          const coords = editor.view.coordsAtPos(from);
          setPosition({
            top: coords.bottom + 8,
            left: coords.left,
          });
          setIsOpen(true);
          return;
        }
      }
      
      setIsOpen(false);
      setQuery('');
      slashPosRef.current = null;
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor]);

  if (!isOpen || filteredCommands.length === 0) return null;

  let flatIndex = 0;

  return (
    <div
      ref={menuRef}
      className="fixed bg-popover border rounded-lg shadow-lg p-2 z-50 w-64 max-h-80 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {Object.entries(groupedCommands).map(([category, commands]) => (
        <div key={category}>
          <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
            {category}
          </div>
          {commands.map((cmd) => {
            const currentIndex = flatIndex++;
            return (
              <button
                key={cmd.title}
                onClick={() => executeCommand(cmd)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                  currentIndex === selectedIndex ? 'bg-accent' : 'hover:bg-muted'
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-muted rounded">
                  {cmd.icon}
                </div>
                <div>
                  <div className="text-sm font-medium">{cmd.title}</div>
                  <div className="text-xs text-muted-foreground">{cmd.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
