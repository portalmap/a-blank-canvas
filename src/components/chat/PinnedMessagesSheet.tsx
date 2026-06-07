import { Pin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePinnedMessages, useUnpinMessage } from '@/hooks/useChatPins';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface PinnedMessagesSheetProps {
  channelId: string;
  canUnpin: boolean;
}

export const PinnedMessagesSheet = ({ channelId, canUnpin }: PinnedMessagesSheetProps) => {
  const { data: pinned } = usePinnedMessages(channelId);
  const unpinMessage = useUnpinMessage();

  const count = pinned?.length || 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Pin className="h-4 w-4" />
          {count > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-xs">{count}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pin className="h-4 w-4" />
            Mensagens fixadas ({count})
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-120px)]">
          {count === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma mensagem fixada neste canal
            </p>
          ) : (
            <div className="space-y-3">
              {pinned?.map(pin => (
                <div key={pin.id} className="p-3 rounded-md border bg-muted/30">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium">{pin.sender_name || 'Usuário'}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {pin.message?.created_at && format(new Date(pin.message.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                      {canUnpin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => unpinMessage.mutate({ messageId: pin.message_id, channelId })}
                          disabled={unpinMessage.isPending}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words line-clamp-4">
                    {pin.message?.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
