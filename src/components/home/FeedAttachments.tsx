import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, File as FileIcon, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  type FeedAttachment,
  formatBytes,
  getFeedAttachmentUrl,
} from '@/lib/feedAttachments';
import { cn } from '@/lib/utils';

interface FeedAttachmentsProps {
  attachments: FeedAttachment[];
}

function AttachmentImage({
  att,
  onClick,
  className,
}: {
  att: Extract<FeedAttachment, { kind: 'image' }>;
  onClick: () => void;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    getFeedAttachmentUrl(att.storage_path).then(setUrl).catch(() => setUrl(null));
  }, [att.storage_path]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-muted/30 group',
        className
      )}
    >
      {url ? (
        <img
          src={url}
          alt={att.name}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </button>
  );
}

function FileAttachment({
  att,
}: {
  att: Extract<FeedAttachment, { kind: 'file' }>;
}) {
  const handleDownload = async () => {
    try {
      const url = await getFeedAttachmentUrl(att.storage_path);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.name;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
    }
  };

  const isPdf = att.mime?.includes('pdf') || att.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
      <div
        className={cn(
          'h-10 w-10 rounded-md flex items-center justify-center shrink-0',
          isPdf ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
        )}
      >
        <FileIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{att.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(att.size)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleDownload}
        aria-label="Download"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

function DocLinkAttachment({
  att,
}: {
  att: Extract<FeedAttachment, { kind: 'doc_link' }>;
}) {
  return (
    <Link
      to={`/documents/${att.document_id}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-accent/50 transition-colors"
    >
      <div className="h-10 w-10 rounded-md flex items-center justify-center shrink-0 bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{att.title}</p>
        <p className="text-xs text-muted-foreground">Documento do Flow</p>
      </div>
    </Link>
  );
}

export function FeedAttachments({ attachments }: FeedAttachmentsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(
    (a): a is Extract<FeedAttachment, { kind: 'image' }> => a.kind === 'image'
  );
  const files = attachments.filter(
    (a): a is Extract<FeedAttachment, { kind: 'file' }> => a.kind === 'file'
  );
  const docs = attachments.filter(
    (a): a is Extract<FeedAttachment, { kind: 'doc_link' }> => a.kind === 'doc_link'
  );

  const openLightbox = async (idx: number) => {
    setLightboxIndex(idx);
    try {
      const url = await getFeedAttachmentUrl(images[idx].storage_path);
      setLightboxUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  const gridClass =
    images.length === 1
      ? 'grid-cols-1'
      : images.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-2 sm:grid-cols-3';

  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && (
        <div className={cn('grid gap-2', gridClass)}>
          {images.slice(0, 6).map((img, i) => (
            <AttachmentImage
              key={img.storage_path}
              att={img}
              onClick={() => openLightbox(i)}
              className={cn(
                images.length === 1 ? 'aspect-video max-h-96' : 'aspect-square',
                i === 5 && images.length > 6 && 'relative'
              )}
            />
          ))}
          {images.length > 6 && (
            <div className="text-xs text-muted-foreground self-center">
              +{images.length - 6} imagens
            </div>
          )}
        </div>
      )}

      {files.map((f) => (
        <FileAttachment key={f.storage_path} att={f} />
      ))}

      {docs.map((d) => (
        <DocLinkAttachment key={d.document_id} att={d} />
      ))}

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLightboxIndex(null);
            setLightboxUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl p-2 bg-background">
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt=""
              className="w-full max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
