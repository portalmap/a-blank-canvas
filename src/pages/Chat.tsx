import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { ChatSidebar, ChatRoom, ChannelMembersDialog } from '@/components/chat';
import { useChatChannels } from '@/hooks/useChat';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const Chat = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>();
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const { activeWorkspace } = useWorkspace();
  const { data: channels, isLoading } = useChatChannels();

  const selectedChannel = channels?.find(c => c.id === selectedChannelId);

  // Show loading while workspace is being loaded
  if (!activeWorkspace) {
    return (
      <div className="flex h-[calc(100vh-0px)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)]">
      <ChatSidebar
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
      />

      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <ChatRoom
            channelId={selectedChannel.id}
            channelName={
              selectedChannel.type === 'space'
                ? (selectedChannel as any).spaces?.name || selectedChannel.name
                : selectedChannel.name
            }
            channelType={selectedChannel.type as 'space' | 'custom'}
            spaceColor={(selectedChannel as any).spaces?.color}
            onOpenMembers={
              selectedChannel.type === 'custom'
                ? () => setShowMembersDialog(true)
                : undefined
            }
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Selecione um canal</h2>
            <p className="text-muted-foreground max-w-md">
              {isLoading 
                ? 'Carregando canais...' 
                : 'Escolha um canal de Space ou crie um canal personalizado para começar a conversar com sua equipe.'}
            </p>
          </div>
        )}
      </div>

      {selectedChannel && selectedChannel.type === 'custom' && (
        <ChannelMembersDialog
          open={showMembersDialog}
          onOpenChange={setShowMembersDialog}
          channelId={selectedChannel.id}
          channelName={selectedChannel.name}
        />
      )}
    </div>
  );
};

export default Chat;
