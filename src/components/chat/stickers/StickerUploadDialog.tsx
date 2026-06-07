import { useState, useRef } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStickerPacks, useCreateSticker, useCreateStickerPack } from '@/hooks/useStickers';

interface StickerUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StickerUploadDialog = ({ open, onOpenChange }: StickerUploadDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [packId, setPackId] = useState<string>('');
  const [newPackName, setNewPackName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: packs = [] } = useStickerPacks();
  const createSticker = useCreateSticker();
  const createPack = useCreateStickerPack();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSubmit = async () => {
    if (!file) return;

    let targetPackId = packId;
    if (packId === '__new__' && newPackName.trim()) {
      const pack = await createPack.mutateAsync({ name: newPackName.trim() });
      targetPackId = pack.id;
    }

    await createSticker.mutateAsync({
      file,
      packId: targetPackId && targetPackId !== '__new__' ? targetPackId : undefined,
      name: name.trim() || undefined,
    });

    setFile(null);
    setPreview(null);
    setName('');
    setPackId('');
    setNewPackName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload de Figurinha</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-40 object-contain rounded" />
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Clique para selecionar uma imagem</p>
                <p className="text-xs text-muted-foreground">PNG, WebP, JPG (max 2MB)</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />

          <div>
            <Label htmlFor="sticker-name">Nome (opcional)</Label>
            <Input id="sticker-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da figurinha" />
          </div>

          <div>
            <Label>Pacote (opcional)</Label>
            <Select value={packId} onValueChange={setPackId}>
              <SelectTrigger><SelectValue placeholder="Sem pacote" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem pacote</SelectItem>
                {packs.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                <SelectItem value="__new__">+ Criar novo pacote</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {packId === '__new__' && (
            <div>
              <Label>Nome do novo pacote</Label>
              <Input value={newPackName} onChange={e => setNewPackName(e.target.value)} placeholder="Ex: Memes do time" />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!file || createSticker.isPending || createPack.isPending}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {createSticker.isPending ? 'Enviando...' : 'Enviar figurinha'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
