import { useState, useEffect } from 'react';
import { getStickerById, type Sticker } from '@/hooks/useStickers';

interface StickerMessageProps {
  stickerId: string;
}

export const StickerMessage = ({ stickerId }: StickerMessageProps) => {
  const [sticker, setSticker] = useState<Sticker | null>(null);

  useEffect(() => {
    getStickerById(stickerId).then(setSticker);
  }, [stickerId]);

  if (!sticker) {
    return (
      <div className="w-32 h-32 rounded-lg bg-muted animate-pulse" />
    );
  }

  return (
    <img
      src={sticker.signed_url || sticker.image_url}
      alt={sticker.name || 'Figurinha'}
      className="max-w-[200px] max-h-[200px] object-contain rounded-lg"
      loading="lazy"
    />
  );
};

// Utility to check if content is a sticker message
export const isStickerMessage = (content: string): string | null => {
  const match = content.match(/^\[sticker:([a-f0-9-]+)\]$/);
  return match ? match[1] : null;
};
