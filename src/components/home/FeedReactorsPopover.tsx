import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedReactorsPopoverProps {
  postId: string;
  count: number;
  className?: string;
}

const getInitials = (name: string | null) => {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

export function FeedReactorsPopover({ postId, count, className }: FeedReactorsPopoverProps) {
  const { data: reactors = [], isLoading } = useQuery({
    queryKey: ['feed-reactors', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_post_reactions')
        .select('user_id')
        .eq('post_id', postId)
        .limit(50);
      if (error) throw error;
      const ids = [...new Set((data || []).map((r) => r.user_id))];
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ids);
      return profiles || [];
    },
    enabled: count > 0,
    staleTime: 30_000,
  });

  const preview = reactors.slice(0, 3);

  if (count === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('flex items-center -space-x-1.5 hover:opacity-80', className)}
          aria-label={`${count} curtidas`}
        >
          {preview.map((p) => (
            <Avatar key={p.id} className="h-5 w-5 ring-2 ring-background">
              <AvatarImage src={p.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                {getInitials(p.full_name)}
              </AvatarFallback>
            </Avatar>
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
          Curtidas ({count})
        </p>
        {isLoading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {reactors.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-1 py-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {getInitials(p.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs truncate">{p.full_name || 'Usuário'}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
