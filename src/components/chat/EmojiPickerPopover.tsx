import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerPopoverProps {
  onEmojiSelect: (emoji: string) => void;
  triggerClassName?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export const EmojiPickerPopover = ({ onEmojiSelect, triggerClassName, side = 'top', align = 'start' }: EmojiPickerPopoverProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: any) => {
    onEmojiSelect(emoji.native);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName || "h-8 w-8"}
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-auto p-0 border-none shadow-xl">
        <Picker
          data={data}
          onEmojiSelect={handleSelect}
          theme="auto"
          locale="pt"
          previewPosition="none"
          skinTonePosition="search"
          maxFrequentRows={2}
        />
      </PopoverContent>
    </Popover>
  );
};
