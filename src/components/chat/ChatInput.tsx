import { useState, useRef, KeyboardEvent } from 'react';
import { Send, X, Paperclip, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSendMessage } from '@/hooks/useChat';
import { useCreateNotification } from '@/hooks/useNotifications';
import { useUploadChatAttachments } from '@/hooks/useChatAttachments';
import { AudioRecorderButton } from '@/components/audio/AudioRecorderButton';
import { CommentAssigneeSelector } from '@/components/tasks/CommentAssigneeSelector';
import { WorkspaceMember } from '@/hooks/useWorkspaceMembers';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { StickerGallery } from './stickers/StickerGallery';
import { useRecordStickerUsage, type Sticker } from '@/hooks/useStickers';
import { toast } from 'sonner';

interface ChatInputProps {
  channelId: string;
  channelName: string;
  workspaceId?: string;
  replyTo?: string;
}

export const ChatInput = ({ channelId, channelName, workspaceId, replyTo }: ChatInputProps) => {
  const [content, setContent] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<WorkspaceMember | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendMessage();
  const createNotification = useCreateNotification();
  const { uploadFiles } = useUploadChatAttachments();
  const recordStickerUsage = useRecordStickerUsage();

  const handleStickerSelect = async (sticker: Sticker) => {
    await sendMessage.mutateAsync({
      channelId,
      content: `[sticker:${sticker.id}]`,
      replyTo,
    });
    recordStickerUsage.mutate(sticker.id);
  };

  const getDisplayName = (member: WorkspaceMember) => {
    const fullName = member.profile?.full_name;
    if (!fullName) return 'Usuário';
    if (fullName.includes('@')) return fullName.split('@')[0];
    return fullName;
  };

  const getInitials = (member: WorkspaceMember) => {
    const name = getDisplayName(member);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 200;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files]);
    }
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAudioReady = (file: File, description?: string) => {
    setPendingFiles(prev => [...prev, file]);
    if (description) {
      setContent(prev => prev ? `${prev}\n🎤 ${description}` : `🎤 ${description}`);
    }
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if ((!trimmedContent && pendingFiles.length === 0) || sendMessage.isPending || isUploading) return;

    setIsUploading(true);

    try {
      let attachments: any[] | undefined;
      if (pendingFiles.length > 0) {
        attachments = await uploadFiles(pendingFiles);
      }

      setContent('');
      setPendingFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
        textareaRef.current.style.overflowY = 'hidden';
      }

      const assigneeId = selectedAssignee?.user_id;
      const result = await sendMessage.mutateAsync({
        channelId,
        content: trimmedContent || (attachments ? '📎 Anexo' : ''),
        assigneeId,
        attachments,
        replyTo,
      });

      if (selectedAssignee && workspaceId && result.hasAssignee) {
        await createNotification.mutateAsync({
          userId: selectedAssignee.user_id,
          workspaceId,
          type: 'chat_assignment',
          title: 'Nova atribuição no chat',
          message: `Você foi atribuído em uma mensagem no canal #${channelName}`,
        });
      }

      setSelectedAssignee(null);
      textareaRef.current?.focus();
    } catch (err) {
      toast.error('Erro ao enviar anexo');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className="border-t p-4">
      {/* Badge de atribuição */}
      {selectedAssignee && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md mb-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={selectedAssignee.profile?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">
              {getInitials(selectedAssignee)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">
            Atribuído a: <strong>{getDisplayName(selectedAssignee)}</strong>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-auto"
            onClick={() => setSelectedAssignee(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingFiles.map((file, i) => (
            <div key={i} className="relative group border border-border rounded-md overflow-hidden">
              {isImage(file) ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-16 w-16 object-cover"
                />
              ) : (
                <div className="h-16 w-16 flex flex-col items-center justify-center bg-muted p-1">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground truncate w-full text-center mt-0.5">
                    {file.name.split('.').pop()}
                  </span>
                </div>
              )}
              <button
                onClick={() => removePendingFile(i)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Mensagem em #${channelName}`}
          className="min-h-[44px] max-h-[200px] resize-none w-full"
          style={{ overflowY: 'hidden' }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <EmojiPickerPopover
              onEmojiSelect={(emoji) => {
                const el = textareaRef.current;
                if (el) {
                  const start = el.selectionStart;
                  const end = el.selectionEnd;
                  const newContent = content.slice(0, start) + emoji + content.slice(end);
                  setContent(newContent);
                  setTimeout(() => {
                    el.selectionStart = el.selectionEnd = start + emoji.length;
                    el.focus();
                  }, 0);
                } else {
                  setContent(prev => prev + emoji);
                }
              }}
              triggerClassName="flex-shrink-0 h-9 w-9"
              side="top"
            />
            <StickerGallery
              onStickerSelect={handleStickerSelect}
              triggerClassName="flex-shrink-0 h-9 w-9"
              side="top"
            />
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <AudioRecorderButton onAudioReady={handleAudioReady} disabled={isUploading} />
            <CommentAssigneeSelector
              workspaceId={workspaceId}
              selectedAssignee={selectedAssignee}
              onSelect={setSelectedAssignee}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={(!content.trim() && pendingFiles.length === 0) || sendMessage.isPending || isUploading}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
