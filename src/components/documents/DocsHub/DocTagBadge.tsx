import { Badge } from '@/components/ui/badge';

interface DocTagBadgeProps {
  name: string;
  color: string;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

export const DocTagBadge = ({ name, color, onClick, removable, onRemove }: DocTagBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className="cursor-pointer text-xs font-medium transition-all hover:opacity-80"
      style={{
        backgroundColor: `${color}20`,
        borderColor: color,
        color: color,
      }}
      onClick={onClick}
    >
      {name}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-1 hover:opacity-70"
        >
          ×
        </button>
      )}
    </Badge>
  );
};
