import { useState, useEffect } from 'react';
import { useSearchParams } from "@/lib/router-compat";
import { MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { ChatSidebar, ChatRoom, ChannelMembersDialog } from '@/components/chat';
import { useAllChatChannels } from '@/hooks/useChat';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

const Chat = () => {
  const [searchParams] = useSearchParams();
  const channelParam = searchParams.get('channel');
  const messageParam = searchParams.get('message');
  const [selectedChannelId, setSelectedChannelId] = useState<string>();
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const { data: channels, isLoading } = useAllChatChannels();
  const isMobile = useIsMobile();

  // Auto-select channel from URL param
  useEffect(() => {
    if (channelParam && channels?.some(c => c.id === channelParam)) {
      setSelectedChannelId(channelParam);
    }
  }, [channelParam, channels]);

  const selectedChannel = channels?.find(c => c.id === selectedChannelId);

  const room = selectedChannel ? (
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
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center md:p-8">
      <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground/30 md:h-16 md:w-16" />
      <h2 className="mb-2 text-lg font-semibold md:text-xl">Selecione um canal</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {isLoading
          ? 'Carregando canais...'
          : 'Escolha um canal de Space ou crie um canal personalizado para começar a conversar com sua equipe.'}
      </p>
    </div>
  );

  const membersDialog =
    selectedChannel && (selectedChannel.type === 'custom' || selectedChannel.type === 'group_dm') ? (
      <ChannelMembersDialog
        open={showMembersDialog}
        onOpenChange={setShowMembersDialog}
        channelId={selectedChannel.id}
        channelName={selectedChannel.name}
      />
    ) : null;

  // Mobile: lista de canais OU conversa em tela cheia
  if (isMobile) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {selectedChannel ? (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b p-2">
              <Button variant="ghost" size="icon" onClick={() => setSelectedChannelId(undefined)}>
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Voltar para os canais</span>
              </Button>
              <span className="min-w-0 truncate font-medium">{selectedChannel.name}</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{room}</div>
          </>
        ) : isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChatSidebar
              selectedChannelId={selectedChannelId}
              onSelectChannel={setSelectedChannelId}
            />
          </div>
        )}
        {membersDialog}
      </div>
    );
  }

  return (
    <div className="h-full min-h-0">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
          <ChatSidebar
            selectedChannelId={selectedChannelId}
            onSelectChannel={setSelectedChannelId}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={80}>
          <div className="flex h-full flex-1 flex-col overflow-hidden">{room}</div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {membersDialog}
    </div>
  );
};

export default Chat;
