import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, Check, ExternalLink, Maximize2 } from 'lucide-react';
import { useMyAssignedComments } from '@/hooks/useMyAssignedComments';
import { useResolveCommentAssignment } from '@/hooks/useTaskComments';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AssignedCommentsCard = () => {
  const navigate = useNavigate();
  const { data: comments = [], isLoading } = useMyAssignedComments();
  const resolveComment = useResolveCommentAssignment();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleResolve = (e: React.MouseEvent, commentId: string, taskId: string) => {
    e.stopPropagation();
    resolveComment.mutate({ commentId, taskId });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const CommentsList = () => (
    <div className="space-y-3">
      {comments.map(comment => (
        <div
          key={comment.id}
          className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.author?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(comment.author?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {comment.author?.full_name || 'Usuário'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {comment.content}
              </p>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigate(`/task/${comment.task_id}`)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {comment.task_title}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleResolve(e, comment.id, comment.task_id)}
                  disabled={resolveComment.isPending}
                  className="h-7 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Resolver
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">Você não tem comentários atribuídos</p>
    </div>
  );

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentários atribuídos
              <Badge variant="secondary" className="ml-1 text-xs">
                {comments.length}
              </Badge>
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsExpanded(true)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Expandir</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : comments.length === 0 ? (
            <EmptyState />
          ) : (
            <CommentsList />
          )}
        </CardContent>
      </Card>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comentários atribuídos
              <Badge variant="secondary" className="ml-1">
                {comments.length}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {comments.length === 0 ? <EmptyState /> : <CommentsList />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
