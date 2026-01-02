import { useState } from 'react';
import { Hash, Plus, MessageCircle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatChannels } from '@/hooks/useChat';
import { CreateChannelDialog } from './CreateChannelDialog';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  selectedChannelId?: string;
  onSelectChannel: (channelId: string) => void;
}

export const ChatSidebar = ({ selectedChannelId, onSelectChannel }: ChatSidebarProps) => {
  const { data: channels, isLoading } = useChatChannels();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [spacesExpanded, setSpacesExpanded] = useState(true);
  const [customExpanded, setCustomExpanded] = useState(true);

  const spaceChannels = channels?.filter(c => c.type === 'space') || [];
  const customChannels = channels?.filter(c => c.type === 'custom') || [];

  if (isLoading) {
    return (
      <div className="w-64 border-r bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Chat
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Space Channels */}
          <div className="mb-4">
            <button
              onClick={() => setSpacesExpanded(!spacesExpanded)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full px-2 py-1"
            >
              {spacesExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              SPACES ({spaceChannels.length})
            </button>
            
            {spacesExpanded && (
              <div className="mt-1 space-y-0.5">
                {spaceChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                      selectedChannelId === channel.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: (channel as any).spaces?.color || '#6366f1' }}
                    />
                    <span className="truncate">
                      {(channel as any).spaces?.name || channel.name}
                    </span>
                  </button>
                ))}
                {spaceChannels.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">
                    Nenhum space disponível
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Custom Channels */}
          <div>
            <button
              onClick={() => setCustomExpanded(!customExpanded)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full px-2 py-1"
            >
              {customExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              PERSONALIZADOS ({customChannels.length})
            </button>
            
            {customExpanded && (
              <div className="mt-1 space-y-0.5">
                {customChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                      selectedChannelId === channel.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{channel.name}</span>
                  </button>
                ))}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo canal
                </Button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <CreateChannelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
};
