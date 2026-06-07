interface ColorPickerProps {
  onColorSelect: (color: string) => void;
  label: string;
  isHighlight?: boolean;
}

const TEXT_COLORS = [
  { name: 'Padrão', color: 'inherit' },
  { name: 'Vermelho', color: '#ef4444' },
  { name: 'Laranja', color: '#f97316' },
  { name: 'Amarelo', color: '#eab308' },
  { name: 'Verde', color: '#22c55e' },
  { name: 'Azul', color: '#3b82f6' },
  { name: 'Roxo', color: '#a855f7' },
  { name: 'Rosa', color: '#ec4899' },
  { name: 'Cinza', color: '#6b7280' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Amarelo', color: '#fef08a' },
  { name: 'Verde', color: '#bbf7d0' },
  { name: 'Azul', color: '#bfdbfe' },
  { name: 'Rosa', color: '#fbcfe8' },
  { name: 'Roxo', color: '#e9d5ff' },
  { name: 'Laranja', color: '#fed7aa' },
  { name: 'Vermelho', color: '#fecaca' },
  { name: 'Cinza', color: '#e5e7eb' },
];

export const ColorPicker = ({ onColorSelect, label, isHighlight = false }: ColorPickerProps) => {
  const colors = isHighlight ? HIGHLIGHT_COLORS : TEXT_COLORS;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-5 gap-1">
        {colors.map((item) => (
          <button
            key={item.color}
            onClick={() => onColorSelect(item.color)}
            className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
            style={{ backgroundColor: item.color === 'inherit' ? 'transparent' : item.color }}
            title={item.name}
          >
            {item.color === 'inherit' && (
              <span className="text-xs">A</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
