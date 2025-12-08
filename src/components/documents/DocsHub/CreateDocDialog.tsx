import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FileText, BookOpen } from 'lucide-react';

interface CreateDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; emoji?: string; is_wiki?: boolean }) => void;
  isLoading?: boolean;
}

const EMOJI_OPTIONS = ['📄', '📝', '📋', '📌', '📎', '📂', '🗂️', '📑', '📒', '📓', '💡', '🎯', '🚀', '⭐', '🔖'];

export const CreateDocDialog = ({ open, onOpenChange, onSubmit, isLoading }: CreateDocDialogProps) => {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📄');
  const [isWiki, setIsWiki] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSubmit({ title: title.trim(), emoji, is_wiki: isWiki });
    setTitle('');
    setEmoji('📄');
    setIsWiki(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWiki ? <BookOpen className="h-5 w-5 text-purple-500" /> : <FileText className="h-5 w-5" />}
            Novo {isWiki ? 'Wiki' : 'Documento'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    emoji === e 
                      ? 'bg-primary/20 ring-2 ring-primary' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título do documento..."
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium text-sm">Criar como Wiki</p>
                <p className="text-xs text-muted-foreground">
                  Wikis aparecem em destaque para toda a equipe
                </p>
              </div>
            </div>
            <Switch checked={isWiki} onCheckedChange={setIsWiki} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || isLoading}>
              {isLoading ? 'Criando...' : 'Criar Documento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
