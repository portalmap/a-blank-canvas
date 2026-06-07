import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DashboardCard } from '@/hooks/useDashboards';

interface CardResizeDialogProps {
  card: DashboardCard | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (w: number, h: number) => void;
}

export const CardResizeDialog = ({
  card,
  open,
  onOpenChange,
  onSave,
}: CardResizeDialogProps) => {
  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(2);

  useEffect(() => {
    if (card) {
      setWidth(card.position.w || 4);
      setHeight(card.position.h || 2);
    }
  }, [card]);

  const handleSave = () => {
    onSave(width, height);
    onOpenChange(false);
  };

  const previewWidth = Math.round((width / 12) * 100);
  const previewHeight = height * 150;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dimensões do Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Largura */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Largura (colunas)</Label>
              <span className="text-sm text-muted-foreground font-medium">
                {width} de 12
              </span>
            </div>
            <Slider
              value={[width]}
              onValueChange={([value]) => setWidth(value)}
              min={2}
              max={12}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pequeno</span>
              <span>Médio</span>
              <span>Grande</span>
            </div>
          </div>

          {/* Altura */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Altura (unidades)</Label>
              <span className="text-sm text-muted-foreground font-medium">
                {height} ({previewHeight}px)
              </span>
            </div>
            <Slider
              value={[height]}
              onValueChange={([value]) => setHeight(value)}
              min={1}
              max={6}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Compacto</span>
              <span>Médio</span>
              <span>Alto</span>
            </div>
          </div>

          {/* Prévia */}
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">Prévia do tamanho:</p>
            <div className="flex items-center gap-2">
              <div 
                className="bg-primary/20 border-2 border-dashed border-primary/40 rounded-md transition-all"
                style={{ 
                  width: `${previewWidth}%`,
                  height: `${Math.min(previewHeight / 3, 80)}px`,
                  minWidth: '60px'
                }}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {previewWidth}% × {previewHeight}px
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
