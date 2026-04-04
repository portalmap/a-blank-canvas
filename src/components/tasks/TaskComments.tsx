import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Loader2, Trash2 } from 'lucide-react';
import { useTaskComments, useCreateTaskComment, useDeleteTaskComment } from '@/hooks/useTaskComments';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { AudioRecorderButton } from '@/components/audio/AudioRecorderButton';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { useUploadChatAttachments } from '@/hooks/useChatAttachments';
import { toast } from 'sonner';

interface TaskCommentsProps {
  taskId: string;
}

export const TaskComments = ({ taskId }: TaskCommentsProps) => {
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();

  const { data: comments, isLoading } = useTaskComments(taskId);
  const createComment = useCreateTaskComment();
  const deleteComment = useDeleteTaskComment();
  const { uploadFiles } = useUploadChatAttachments();
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    await createComment.mutateAsync({
      taskId,
      content: newComment,
    });

    setNewComment('');
  };

  const handleAudioReady = async (file: File, description?: string) => {
    setIsUploadingAudio(true);
    try {
      const attachments = await uploadFiles([file]);
      const audioUrl = attachments[0]?.file_url;
      if (!audioUrl) throw new Error('Upload falhou');
      const commentContent = description
        ? `🎤 ${description}\n[audio:${audioUrl}]`
        : `[audio:${audioUrl}]`;
      await createComment.mutateAsync({ taskId, content: commentContent });
    } catch {
      toast.error('Erro ao enviar áudio');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const renderCommentContent = (content: string) => {
    const audioMatch = content.match(/\[audio:(.*?)\]/);
    if (audioMatch) {
      const audioUrl = audioMatch[1];
      const desc = content.replace(/\[audio:.*?\]/, '').replace(/^🎤\s*/, '').trim();
      return (
        <div>
          <AudioPlayer src={audioUrl} description={desc || undefined} />
        </div>
      );
    }
    return <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        Comentários
        {comments && comments.length > 0 && (
          <span className="text-muted-foreground">({comments.length})</span>
        )}
      </div>

      {/* Área de novo comentário */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escreva um comentário..."
          rows={3}
        />
        <div className="flex justify-end">
          <Button 
            size="sm" 
            onClick={handleSubmit}
            disabled={!newComment.trim() || createComment.isPending}
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Comentar
          </Button>
        </div>
      </div>

      {/* Lista de comentários */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda
          </p>
        ) : (
          comments?.map((comment: any) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.author?.avatar_url || undefined} />
                <AvatarFallback>
                  {comment.author?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                  {user?.id === comment.author_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteComment.mutate({ id: comment.id, taskId })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
