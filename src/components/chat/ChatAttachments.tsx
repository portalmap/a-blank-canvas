import { useState } from 'react';
import { FileIcon, Download } from 'lucide-react';
import { ChatImageDialog } from './ChatImageDialog';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import type { ChatAttachment } from '@/hooks/useChatAttachments';

interface ChatAttachmentsProps {
  attachments: (ChatAttachment & { description?: string })[];
}

const isImage = (type: string) => type.startsWith('image/');
const isAudio = (type: string) => type.startsWith('audio/');

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ChatAttachments = ({ attachments }: ChatAttachmentsProps) => {
  const [previewImage, setPreviewImage] = useState<ChatAttachment | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-1">
        {attachments.map((att, i) =>
          isAudio(att.file_type) ? (
            <AudioPlayer key={i} src={att.file_url} description={att.description} />
          ) : isImage(att.file_type) ? (
            <img
              key={i}
              src={att.file_url}
              alt={att.file_name}
              className="max-w-[200px] max-h-[150px] rounded-md cursor-pointer object-cover border border-border hover:opacity-80 transition-opacity"
              onClick={() => setPreviewImage(att)}
            />
          ) : (
            <a
              key={i}
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/50 hover:bg-muted text-sm max-w-[250px]"
            >
              <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{att.file_name}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">{formatSize(att.file_size)}</span>
              <Download className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            </a>
          )
        )}
      </div>

      {previewImage && (
        <ChatImageDialog
          open={!!previewImage}
          onOpenChange={(open) => !open && setPreviewImage(null)}
          imageUrl={previewImage.file_url}
          fileName={previewImage.file_name}
        />
      )}
    </>
  );
};
