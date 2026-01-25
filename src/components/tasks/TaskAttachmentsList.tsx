import { useRef } from 'react';
import { Paperclip, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTaskAttachments, useUploadAttachment, useDeleteAttachment } from '@/hooks/useTaskAttachments';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { AttachmentPreview } from './AttachmentPreview';
import { toast } from 'sonner';

interface TaskAttachmentsListProps {
  taskId: string;
}

export const TaskAttachmentsList = ({ taskId }: TaskAttachmentsListProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: attachments, isLoading } = useTaskAttachments(taskId);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const createActivity = useCreateTaskActivity();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const uploaded = await uploadAttachment.mutateAsync({ taskId, file });
        await createActivity.mutateAsync({
          taskId,
          activityType: 'attachment.added',
          fieldName: 'attachment',
          newValue: uploaded.file_name,
          metadata: {
            file_name: uploaded.file_name,
            file_type: uploaded.file_type,
            file_size: uploaded.file_size,
            file_url: uploaded.file_url,
          },
        });
        toast.success(`Anexo "${file.name}" adicionado!`);
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        toast.error(`Erro ao anexar "${file.name}"`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = async (attachment: { id: string; file_url: string; file_name: string }) => {
    try {
      await deleteAttachment.mutateAsync({
        attachmentId: attachment.id,
        taskId,
        fileUrl: attachment.file_url,
      });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'attachment.removed',
        fieldName: 'attachment',
        oldValue: attachment.file_name,
      });
      toast.success('Anexo removido!');
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      toast.error('Erro ao remover anexo');
    }
  };

  const isUploading = uploadAttachment.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Anexos {attachments && attachments.length > 0 && `(${attachments.length})`}
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Adicionar
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : attachments && attachments.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              showRemove
              onRemove={() => handleRemoveAttachment(attachment)}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-2">
          Nenhum anexo. Clique em "Adicionar" para anexar arquivos.
        </div>
      )}
    </div>
  );
};
