import { Download, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ChatImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  fileName: string;
}

export const ChatImageDialog = ({ open, onOpenChange, imageUrl, fileName }: ChatImageDialogProps) => {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = fileName;
    a.target = '_blank';
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-black/90 border-none">
        <VisuallyHidden>
          <DialogTitle>{fileName}</DialogTitle>
        </VisuallyHidden>
        <div className="relative flex items-center justify-center">
          <img
            src={imageUrl}
            alt={fileName}
            className="max-w-full max-h-[85vh] object-contain rounded"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
