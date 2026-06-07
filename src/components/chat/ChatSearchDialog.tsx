import { useState } from 'react';
import { Search, Hash, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useChatSearch } from '@/hooks/useChatSearch';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from "@/lib/router-compat";

interface ChatSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentChannelId?: string;
  onNavigateToMessage?: (channelId: string, messageId: string) => void;
}

export const ChatSearchDialog = ({ open, onOpenChange, currentChannelId, onNavigateToMessage }: ChatSearchDialogProps) => {
  const [query, setQuery] = useState('');
  const [searchInCurrentChannel, setSearchInCurrentChannel] = useState(false);
  const { data: results, isLoading } = useChatSearch(query, searchInCurrentChannel ? currentChannelId : undefined);
  const navigate = useNavigate();

  const handleSelectResult = (result: { channel_id: string; id: string }) => {
    if (onNavigateToMessage) {
      onNavigateToMessage(result.channel_id, result.id);
    } else {
      navigate(`/chat?channel=${result.channel_id}&message=${result.id}`);
    }
    onOpenChange(false);
    setQuery('');
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text.length > 120 ? text.slice(0, 120) + '...' : text;
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + q.length + 40);
    const snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
    return snippet;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Pesquisar mensagens
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar mensagens..."
            autoFocus
          />

          {currentChannelId && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={searchInCurrentChannel}
                onChange={(e) => setSearchInCurrentChannel(e.target.checked)}
                className="rounded"
              />
              Buscar apenas no canal atual
            </label>
          )}

          <ScrollArea className="max-h-[400px]">
            {isLoading && query.length >= 2 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : results && results.length > 0 ? (
              <div className="space-y-1">
                {results.map(result => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{result.sender_name || 'Usuário'}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {result.channel_name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(result.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {highlightMatch(result.content, query)}
                    </p>
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum resultado encontrado
              </p>
            ) : query.length > 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Digite pelo menos 2 caracteres
              </p>
            ) : null}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
