import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Documentos',
    emojis: ['📄', '📝', '📋', '📌', '📎', '📂', '🗂️', '📑', '📒', '📓', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '🗒️', '🗓️', '📆', '📅', '🧾', '📮', '✉️', '📩', '📨', '📧'],
  },
  {
    label: 'Negócios',
    emojis: ['💼', '🏢', '🏗️', '📊', '📈', '📉', '💰', '💳', '🏦', '🤝', '👔', '🎯', '🏆', '📣', '📢', '🔔', '💎', '⚖️', '🧮', '🖥️', '💻', '📱', '⌨️', '🖨️'],
  },
  {
    label: 'Ideias & Criatividade',
    emojis: ['💡', '🚀', '⭐', '✨', '🎨', '🎭', '🎬', '🎤', '🎧', '🎵', '🎹', '🖌️', '✏️', '🖊️', '🖋️', '🔮', '🧠', '💭', '💬', '🗯️', '🔍', '🔎'],
  },
  {
    label: 'Natureza',
    emojis: ['🌍', '🌎', '🌏', '🌳', '🌲', '🌴', '🌵', '🌿', '🍀', '🌺', '🌻', '🌹', '🌷', '🌸', '💐', '🍄', '🌈', '☀️', '🌙', '⭐', '🌊', '🔥', '❄️', '⛈️'],
  },
  {
    label: 'Comida',
    emojis: ['☕', '🍵', '🧃', '🍺', '🍷', '🍕', '🍔', '🍟', '🌮', '🍣', '🍰', '🎂', '🍩', '🍪', '🍫', '🍬', '🍭', '🍎', '🍊', '🍋', '🍇', '🍓', '🥑', '🥕'],
  },
  {
    label: 'Atividades',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🏸', '🥊', '🏋️', '🚴', '🏄', '🎿', '🛹', '🎮', '🕹️', '🎲', '♟️', '🧩', '🎪', '🎡', '🎢'],
  },
  {
    label: 'Símbolos',
    emojis: ['✅', '❌', '⚠️', '🚫', '✳️', '❇️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '🔗', '🔖', '🏷️', '🔑', '🛡️', '⚡', '♻️', '🔒'],
  },
  {
    label: 'Rostos',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😎', '🤓', '🧐', '🤔', '😏', '🤗', '🤫', '🤭', '😶'],
  },
  {
    label: 'Animais',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦅', '🦉', '🦋', '🐛', '🐝', '🐞'],
  },
];

interface EmojiPickerProps {
  selectedEmoji?: string;
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ selectedEmoji, onSelect, className }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].label);

  const filteredCategories = search
    ? EMOJI_CATEGORIES.map(cat => ({
        ...cat,
        emojis: cat.emojis.filter(() => true), // emojis can't be searched by text easily, show all when searching
      })).filter(cat => cat.label.toLowerCase().includes(search.toLowerCase()) || !search)
    : EMOJI_CATEGORIES;

  const displayCategories = search
    ? [{ label: 'Resultados', emojis: EMOJI_CATEGORIES.flatMap(c => c.emojis) }]
    : filteredCategories;

  return (
    <div className={cn('w-full', className)}>
      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar categoria..."
          className="h-8 pl-8 text-sm"
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
          {EMOJI_CATEGORIES.map(cat => (
            <button
              key={cat.label}
              type="button"
              onClick={() => setActiveCategory(cat.label)}
              className={cn(
                'text-xs px-2 py-1 rounded-md whitespace-nowrap transition-colors',
                activeCategory === cat.label
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <ScrollArea className="h-48">
        {(search ? displayCategories : displayCategories.filter(c => c.label === activeCategory)).map(cat => (
          <div key={cat.label}>
            {search && (
              <p className="text-xs font-medium text-muted-foreground mb-1">{cat.label}</p>
            )}
            <div className="grid grid-cols-8 gap-1">
              {cat.emojis.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onSelect(e)}
                  className={cn(
                    'w-8 h-8 rounded-md text-lg flex items-center justify-center transition-all hover:scale-110',
                    selectedEmoji === e
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
