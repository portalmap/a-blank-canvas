import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocumentLinkPickerProps {
  onPick: (doc: { id: string; title: string }) => void;
  trigger: React.ReactNode;
}

export function DocumentLinkPicker({ onPick, trigger }: DocumentLinkPickerProps) {
  const { activeWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['feed-docs-picker', activeWorkspace?.id, search],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];
      let q = supabase
        .from('documents')
        .select('id, title, emoji')
        .eq('workspace_id', activeWorkspace.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (search.trim()) q = q.ilike('title', `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!activeWorkspace?.id,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <Input
          placeholder="Buscar documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
          autoFocus
        />
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : docs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhum documento encontrado
            </p>
          ) : (
            <div className="space-y-1">
              {docs.map((d) => (
                <Button
                  key={d.id}
                  variant="ghost"
                  className="w-full justify-start gap-2 h-auto py-2"
                  onClick={() => {
                    onPick({ id: d.id, title: d.title });
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="shrink-0">
                    {d.emoji || <FileText className="h-4 w-4" />}
                  </span>
                  <span className="text-sm truncate text-left">{d.title}</span>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
