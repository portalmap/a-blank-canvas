import { useState, useRef, useCallback, useEffect } from 'react';
import { Type, RotateCw, Crop, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStickerPacks, useCreateSticker, useCreateStickerPack } from '@/hooks/useStickers';

interface StickerCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

export const StickerCreatorDialog = ({ open, onOpenChange }: StickerCreatorDialogProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState([100]);
  const [textOverlay, setTextOverlay] = useState<TextOverlay>({ text: '', x: 50, y: 90, size: 32, color: '#ffffff' });
  const [packId, setPackId] = useState('');
  const [newPackName, setNewPackName] = useState('');
  const [name, setName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: packs = [] } = useStickerPacks();
  const createSticker = useCreateSticker();
  const createPack = useCreateStickerPack();

  const CANVAS_SIZE = 512;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const s = scale[0] / 100;
    const aspectRatio = image.width / image.height;
    let drawW: number, drawH: number;
    if (aspectRatio > 1) {
      drawW = CANVAS_SIZE * s;
      drawH = (CANVAS_SIZE / aspectRatio) * s;
    } else {
      drawH = CANVAS_SIZE * s;
      drawW = (CANVAS_SIZE * aspectRatio) * s;
    }

    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Text overlay
    if (textOverlay.text) {
      ctx.save();
      ctx.font = `bold ${textOverlay.size}px sans-serif`;
      ctx.fillStyle = textOverlay.color;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      const tx = (textOverlay.x / 100) * CANVAS_SIZE;
      const ty = (textOverlay.y / 100) * CANVAS_SIZE;
      ctx.strokeText(textOverlay.text, tx, ty);
      ctx.fillText(textOverlay.text, tx, ty);
      ctx.restore();
    }
  }, [image, rotation, scale, textOverlay]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = URL.createObjectURL(file);
    if (!name) setName(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;

    let targetPackId = packId;
    if (packId === '__new__' && newPackName.trim()) {
      const pack = await createPack.mutateAsync({ name: newPackName.trim() });
      targetPackId = pack.id;
    }

    await createSticker.mutateAsync({
      file: blob,
      packId: targetPackId && targetPackId !== '__new__' ? targetPackId : undefined,
      name: name.trim() || undefined,
    });

    // Reset
    setImage(null);
    setRotation(0);
    setScale([100]);
    setTextOverlay({ text: '', x: 50, y: 90, size: 32, color: '#ffffff' });
    setName('');
    setPackId('');
    setNewPackName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Figurinha</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!image ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Crop className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Selecione uma imagem base</p>
              <p className="text-xs text-muted-foreground">PNG, WebP, JPG</p>
            </div>
          ) : (
            <>
              {/* Canvas preview */}
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="border rounded-lg bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGD4z8DAwMhABGBkZGT8T4wBjIyM/4nRzMjI+J+BgYGRGC8AAAD//wMAEhQHAUCNiQAAAABJRU5ErkJggg==')]"
                  style={{ width: 300, height: 300 }}
                />
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs flex items-center gap-1 mb-1">
                    <RotateCw className="h-3 w-3" /> Rotação: {rotation}°
                  </Label>
                  <Slider value={[rotation]} onValueChange={v => setRotation(v[0])} min={0} max={360} step={1} />
                </div>

                <div>
                  <Label className="text-xs mb-1">Escala: {scale[0]}%</Label>
                  <Slider value={scale} onValueChange={setScale} min={20} max={200} step={1} />
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Type className="h-3 w-3" /> Texto sobre a imagem
                  </Label>
                  <Input
                    value={textOverlay.text}
                    onChange={e => setTextOverlay(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Texto opcional..."
                    className="h-8 text-sm"
                  />
                  {textOverlay.text && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Tamanho</Label>
                        <Slider value={[textOverlay.size]} onValueChange={v => setTextOverlay(prev => ({ ...prev, size: v[0] }))} min={12} max={80} step={1} />
                      </div>
                      <div>
                        <Label className="text-xs">Cor</Label>
                        <input
                          type="color"
                          value={textOverlay.color}
                          onChange={e => setTextOverlay(prev => ({ ...prev, color: e.target.value }))}
                          className="w-full h-8 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Posição X: {textOverlay.x}%</Label>
                        <Slider value={[textOverlay.x]} onValueChange={v => setTextOverlay(prev => ({ ...prev, x: v[0] }))} min={0} max={100} step={1} />
                      </div>
                      <div>
                        <Label className="text-xs">Posição Y: {textOverlay.y}%</Label>
                        <Slider value={[textOverlay.y]} onValueChange={v => setTextOverlay(prev => ({ ...prev, y: v[0] }))} min={0} max={100} step={1} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

          {image && (
            <>
              <div>
                <Label>Nome (opcional)</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da figurinha" />
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
              <Button onClick={handleSave} disabled={createSticker.isPending} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                {createSticker.isPending ? 'Salvando...' : 'Salvar figurinha'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
