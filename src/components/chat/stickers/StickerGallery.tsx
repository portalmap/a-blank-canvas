import { useState } from 'react';
import { Sticker as StickerIcon, Plus, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStickerPacks, useStickers, useRecentStickers, type Sticker } from '@/hooks/useStickers';
import { StickerUploadDialog } from './StickerUploadDialog';
import { StickerCreatorDialog } from './StickerCreatorDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StickerGalleryProps {
  onStickerSelect: (sticker: Sticker) => void;
  triggerClassName?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const StickerGallery = ({ onStickerSelect, triggerClassName, side = 'top' }: StickerGalleryProps) => {
  const [open, setOpen] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string | undefined>();
  const [showUpload, setShowUpload] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

  const { data: packs = [] } = useStickerPacks();
  const { data: stickers = [] } = useStickers(selectedPackId);
  const { data: recentStickers = [] } = useRecentStickers();

  const handleSelect = (sticker: Sticker) => {
    onStickerSelect(sticker);
    setOpen(false);
  };

  const StickerGrid = ({ items }: { items: Sticker[] }) => (
    <div className="grid grid-cols-4 gap-2 p-2">
      {items.length === 0 && (
        <p className="col-span-4 text-center text-sm text-muted-foreground py-8">
          Nenhuma figurinha encontrada
        </p>
      )}
      {items.map(sticker => (
        <button
          key={sticker.id}
          onClick={() => handleSelect(sticker)}
          className="aspect-square rounded-lg hover:bg-accent/50 p-1 transition-colors flex items-center justify-center"
        >
          <img
            src={sticker.signed_url || sticker.image_url}
            alt={sticker.name || 'Figurinha'}
            className="max-w-full max-h-full object-contain rounded"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={triggerClassName || "h-9 w-9"}>
                <StickerIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Figurinhas</TooltipContent>
          </Tooltip>
        </PopoverTrigger>
        <PopoverContent side={side} align="start" className="w-80 p-0">
          <Tabs defaultValue="recent" className="w-full">
            <div className="flex items-center justify-between border-b px-2 py-1">
              <TabsList className="h-8 bg-transparent">
                <TabsTrigger value="recent" className="text-xs h-7 px-2">
                  <Clock className="h-3 w-3 mr-1" />Recentes
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs h-7 px-2">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="packs" className="text-xs h-7 px-2">
                  <Package className="h-3 w-3 mr-1" />Pacotes
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setOpen(false); setShowUpload(true); }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Upload figurinha</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setOpen(false); setShowCreator(true); }}>
                      <StickerIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Criar figurinha</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <ScrollArea className="h-64">
              <TabsContent value="recent" className="m-0">
                <StickerGrid items={recentStickers} />
              </TabsContent>
              <TabsContent value="all" className="m-0">
                <StickerGrid items={stickers} />
              </TabsContent>
              <TabsContent value="packs" className="m-0">
                {selectedPackId ? (
                  <div>
                    <button onClick={() => setSelectedPackId(undefined)} className="text-xs text-primary px-3 py-1 hover:underline">
                      ← Voltar aos pacotes
                    </button>
                    <StickerGrid items={stickers} />
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {packs.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        Nenhum pacote criado
                      </p>
                    )}
                    {packs.map(pack => (
                      <button
                        key={pack.id}
                        onClick={() => setSelectedPackId(pack.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
                      >
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{pack.name}</p>
                          {pack.description && <p className="text-xs text-muted-foreground truncate">{pack.description}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </PopoverContent>
      </Popover>

      <StickerUploadDialog open={showUpload} onOpenChange={setShowUpload} />
      <StickerCreatorDialog open={showCreator} onOpenChange={setShowCreator} />
    </>
  );
};
