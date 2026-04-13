import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import { ChatSidebar, ChatRoom, ChannelMembersDialog } from '@/components/chat';
import { useAllChatChannels } from '@/hooks/useChat';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const Chat = () => {
  const [searchParams] = useSearchParams();
  const channelParam = searchParams.get('channel');
  const messageParam = searchParams.get('message');
  const [selectedChannelId, setSelectedChannelId] = useState<string>();
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const { data: channels, isLoading } = useAllChatChannels();

  // Auto-select channel from URL param
  useEffect(() => {
    if (channelParam && channels?.some(c => c.id === channelParam)) {
      setSelectedChannelId(channelParam);
    }
  }, [channelParam, channels]);

  const selectedChannel = channels?.find(c => c.id === selectedChannelId);

  return (
    <div className="h-[calc(100vh-0px)]">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
          <ChatSidebar
            selectedChannelId={selectedChannelId}
            onSelectChannel={setSelectedChannelId}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={80}>
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {selectedChannel ? (
              <ChatRoom
                channelId={selectedChannel.id}
                channelName={selectedChannel.name}
                channelType={selectedChannel.type as 'space' | 'custom' | 'dm' | 'group_dm'}
                spaceColor={(selectedChannel as any).spaces?.color}
                workspaceId={selectedChannel.workspace_id}
                highlightMessageId={messageParam || undefined}
                onOpenMembers={
                  (selectedChannel.type === 'custom' || selectedChannel.type === 'group_dm')
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
        </ResizablePanel>
      </ResizablePanelGroup>

      {selectedChannel && (selectedChannel.type === 'custom' || selectedChannel.type === 'group_dm') && (
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
