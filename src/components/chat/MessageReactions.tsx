import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { GroupedReaction } from '@/hooks/useChatReactions';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAllProfiles } from '@/hooks/useAllProfiles';

interface MessageReactionsProps {
  reactions: GroupedReaction[];
  onToggleReaction: (emoji: string) => void;
  onAddReaction: (emoji: string) => void;
}

export const MessageReactions = ({ reactions, onToggleReaction, onAddReaction }: MessageReactionsProps) => {
  const { data: profiles } = useAllProfiles();

  if (reactions.length === 0) return null;

  const getUserNames = (userIds: string[]) => {
    if (!profiles) return userIds.length.toString();
    return userIds
      .map(id => {
        const p = profiles.find(pr => pr.id === id);
        return p?.full_name || 'Usuário';
      })
      .join(', ');
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map(reaction => (
        <Tooltip key={reaction.emoji}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggleReaction(reaction.emoji)}
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                reaction.hasReacted
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/50 border-border hover:bg-muted"
              )}
            >
              <span>{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="text-xs">{getUserNames(reaction.userIds)}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      <EmojiPickerPopover
        onEmojiSelect={onAddReaction}
        triggerClassName="h-6 w-6 rounded-full"
        side="top"
      />
    </div>
  );
};
