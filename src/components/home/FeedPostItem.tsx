// @ts-nocheck
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  MessageCircle,
  MoreVertical,
  Trash2,
  Send,
  Loader2,
  Pin,
  PinOff,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePostComments } from '@/hooks/useFeedPosts';
import { toast } from 'sonner';
import type { FeedPost } from '@/hooks/useFeedPosts';
import { FeedContent } from './FeedContent';
import { FeedAttachments } from './FeedAttachments';
import { FeedReactorsPopover } from './FeedReactorsPopover';
import { CreatePostDialog, type CreatePostDialogValue } from './CreatePostDialog';
import { formatCount } from '@/lib/feedAttachments';

interface FeedPostItemProps {
  post: FeedPost;
  isAdmin: boolean;
  onReact: (postId: string) => void;
  onAddComment: (postId: string, content: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onDeleteComment: (commentId: string, postId: string) => Promise<void>;
  onUpdatePost: (postId: string, data: CreatePostDialogValue) => Promise<void>;
  onTogglePin: (postId: string, isPinned: boolean) => Promise<void>;
  isAddingComment: boolean;
  isUpdating: boolean;
}

const getInitials = (name: string | null) => {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

export function FeedPostItem({
  post,
  isAdmin,
  onReact,
  onAddComment,
  onDeletePost,
  onDeleteComment,
  onUpdatePost,
  onTogglePin,
  isAddingComment,
  isUpdating,
}: FeedPostItemProps) {
  const { user } = useAuth();
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { data: comments = [], isLoading: isLoadingComments } = usePostComments(
    post.id,
    isCommentsOpen
  );

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const isAuthor = post.author_id === user?.id;
  const canDeletePost = isAdmin || isAuthor;
  const canEditPost = isAdmin || isAuthor;
  const canPin = isAdmin;

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    try {
      await onAddComment(post.id, text);
      setCommentText('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao enviar comentário';
      toast.error(message);
      console.error(e);
    }
  };

  const handleDeletePost = async () => {
    try {
      await onDeletePost(post.id);
      toast.success('Publicação excluída');
    } catch (e) {
      toast.error('Erro ao excluir publicação');
      console.error(e);
    } finally {
      setConfirmDeletePost(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await onDeleteComment(commentId, post.id);
      toast.success('Comentário excluído');
    } catch (e) {
      toast.error('Erro ao excluir comentário');
      console.error(e);
    } finally {
      setConfirmDeleteCommentId(null);
    }
  };

  const handleTogglePin = async () => {
    try {
      await onTogglePin(post.id, !post.is_pinned);
      toast.success(post.is_pinned ? 'Publicação desafixada' : 'Publicação fixada');
    } catch (e) {
      toast.error('Erro ao alterar fixação');
      console.error(e);
    }
  };

  return (
    <article
      className={cn(
        'border border-border rounded-lg p-4 bg-card transition-colors',
        post.is_pinned && 'border-primary/40 bg-primary/[0.02]'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={post.author?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {getInitials(post.author?.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground truncate">
              {post.author?.full_name || 'Usuário'}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            {post.edited_at && (
              <span className="text-xs text-muted-foreground italic">(editado)</span>
            )}
            {post.is_pinned && (
              <Badge variant="secondary" className="gap-1 text-[10px] py-0 h-5">
                <Pin className="h-3 w-3" /> Fixado
              </Badge>
            )}
          </div>

          {post.title && (
            <h3 className="font-semibold text-base text-foreground mt-2">{post.title}</h3>
          )}

          <div className="mt-1.5">
            <FeedContent content={post.content} format={post.content_format} />
          </div>

          <FeedAttachments attachments={post.attachments} />

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {post.tags.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="text-[10px] py-0 h-5 text-primary border-primary/30"
                >
                  #{t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {(canDeletePost || canEditPost || canPin) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEditPost && (
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {canPin && (
                <DropdownMenuItem onClick={handleTogglePin}>
                  {post.is_pinned ? (
                    <>
                      <PinOff className="h-4 w-4 mr-2" /> Desafixar
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4 mr-2" /> Fixar
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {canDeletePost && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmDeletePost(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir publicação
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-3 ml-13 pl-0">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5 text-muted-foreground hover:text-primary h-8',
            post.user_has_reacted && 'text-primary'
          )}
          onClick={() => onReact(post.id)}
        >
          <Heart className={cn('h-4 w-4', post.user_has_reacted && 'fill-current')} />
          <span className="text-xs font-medium">{formatCount(post.reactions_count)}</span>
        </Button>

        {post.reactions_count > 0 && (
          <FeedReactorsPopover
            postId={post.id}
            count={post.reactions_count}
            className="ml-0 mr-2"
          />
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5 text-muted-foreground hover:text-primary h-8',
            isCommentsOpen && 'text-primary'
          )}
          onClick={() => setIsCommentsOpen((v) => !v)}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs font-medium">{formatCount(post.comments_count)}</span>
        </Button>
      </div>

      {/* Comments section */}
      {isCommentsOpen && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {isLoadingComments ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Seja o primeiro a comentar
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => {
                const canDeleteComment = isAdmin || c.author_id === user?.id;
                return (
                  <div key={c.id} className="flex items-start gap-2 group">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={c.author?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(c.author?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 bg-muted/40 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground truncate">
                          {c.author?.full_name || 'Usuário'}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(c.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words mt-0.5">
                        {c.content}
                      </p>
                    </div>
                    {canDeleteComment && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmDeleteCommentId(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-end gap-2 pt-1">
            <Textarea
              placeholder="Escreva um comentário..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[40px] max-h-32 resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || isAddingComment}
              className="shrink-0"
            >
              {isAddingComment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {isEditing && (
        <CreatePostDialog
          hideTrigger
          open={isEditing}
          onOpenChange={setIsEditing}
          isSubmitting={isUpdating}
          initialPost={{
            title: post.title,
            content: post.content,
            content_format: post.content_format,
            tags: post.tags,
            attachments: post.attachments,
          }}
          onSubmit={async (data) => {
            try {
              await onUpdatePost(post.id, data);
              toast.success('Publicação atualizada');
            } catch (e) {
              toast.error('Erro ao atualizar');
              console.error(e);
            }
          }}
        />
      )}

      {/* Delete post confirmation */}
      <AlertDialog open={confirmDeletePost} onOpenChange={setConfirmDeletePost}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os comentários e curtidas também
              serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDeleteCommentId}
        onOpenChange={(open) => !open && setConfirmDeleteCommentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDeleteCommentId && handleDeleteComment(confirmDeleteCommentId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
