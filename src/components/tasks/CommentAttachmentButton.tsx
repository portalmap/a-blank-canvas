import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommentAttachmentButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const CommentAttachmentButton = ({ 
  onFilesSelected,
  disabled = false,
}: CommentAttachmentButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className="gap-2"
      >
        <Paperclip className="h-4 w-4" />
        <span>Anexar</span>
      </Button>
    </>
  );
};
