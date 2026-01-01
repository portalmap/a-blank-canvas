import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedPost } from '@/hooks/useFeedPosts';

interface FeedPostItemProps {
  post: FeedPost;
  onReact: (postId: string) => void;
  onComment: (postId: string) => void;
}

export function FeedPostItem({ post, onReact, onComment }: FeedPostItemProps) {
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className="border border-border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={post.author?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {getInitials(post.author?.full_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {post.author?.full_name || 'Usuário'}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {timeAgo}
            </span>
          </div>
          
          {/* Content */}
          <div className="mt-2">
            {post.title && (
              <h3 className="font-semibold text-foreground mb-1">
                {post.title}
              </h3>
            )}
            <p className="text-foreground/90 whitespace-pre-wrap break-words">
              {post.content}
            </p>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-4 mt-4 pl-13">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2 text-muted-foreground hover:text-primary",
            post.user_has_reacted && "text-primary"
          )}
          onClick={() => onReact(post.id)}
        >
          <Heart 
            className={cn(
              "h-4 w-4",
              post.user_has_reacted && "fill-current"
            )} 
          />
          <span>{post.reactions_count || ''}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-primary"
          onClick={() => onComment(post.id)}
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post.comments_count || ''}</span>
        </Button>
      </div>
    </div>
  );
}
