import { X, FileText, Film, Music, File, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFileCategory, formatFileSize, TaskAttachment } from '@/hooks/useTaskAttachments';
import { cn } from '@/lib/utils';

interface AttachmentPreviewProps {
  attachment: TaskAttachment | { file: File; preview?: string };
  onRemove?: () => void;
  showRemove?: boolean;
  compact?: boolean;
}

export const AttachmentPreview = ({ 
  attachment, 
  onRemove,
  showRemove = true,
  compact = false,
}: AttachmentPreviewProps) => {
  // Determinar se é um arquivo pendente ou um anexo salvo
  const isFile = 'file' in attachment;
  const fileName = isFile ? attachment.file.name : attachment.file_name;
  const fileType = isFile ? attachment.file.type : attachment.file_type;
  const fileSize = isFile ? attachment.file.size : attachment.file_size;
  const fileUrl = isFile ? attachment.preview : attachment.file_url;
  
  const category = getFileCategory(fileType);

  const getIcon = () => {
    switch (category) {
      case 'image': return null; // Usaremos thumbnail
      case 'video': return <Film className="h-5 w-5" />;
      case 'audio': return <Music className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  const handleOpen = () => {
    if (fileUrl && !isFile) {
      window.open(fileUrl, '_blank');
    }
  };

  const handleDownload = async () => {
    if (!fileUrl || isFile) return;
    
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      window.open(fileUrl, '_blank');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded text-sm group">
        {category === 'image' && fileUrl ? (
          <img 
            src={fileUrl} 
            alt={fileName} 
            className="h-6 w-6 object-cover rounded"
          />
        ) : (
          <div className="h-6 w-6 flex items-center justify-center text-muted-foreground">
            {getIcon()}
          </div>
        )}
        <span className="truncate max-w-[150px]">{fileName}</span>
        {fileSize && (
          <span className="text-xs text-muted-foreground">
            ({formatFileSize(fileSize)})
          </span>
        )}
        {showRemove && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "relative group rounded-lg overflow-hidden border border-border",
      category === 'image' ? "aspect-video" : "p-3"
    )}>
      {category === 'image' && fileUrl ? (
        <>
          <img 
            src={fileUrl} 
            alt={fileName} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {!isFile && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleOpen}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Baixar
                </Button>
              </>
            )}
          </div>
        </>
      ) : category === 'video' && fileUrl ? (
        <video 
          src={fileUrl} 
          controls 
          className="w-full max-h-[200px]"
        />
      ) : category === 'audio' && fileUrl ? (
        <div className="flex items-center gap-3">
          <Music className="h-8 w-8 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            {fileSize && (
              <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
            )}
          </div>
          {fileUrl && !isFile && (
            <audio src={fileUrl} controls className="max-w-[200px]" />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            {fileSize && (
              <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
            )}
          </div>
          {!isFile && fileUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {showRemove && onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className={cn(
            "absolute top-1 right-1 h-6 w-6",
            category === 'image' 
              ? "opacity-0 group-hover:opacity-100 transition-opacity" 
              : ""
          )}
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
