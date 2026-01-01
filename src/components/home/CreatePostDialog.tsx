import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CreatePostDialogProps {
  onSubmit: (data: { title?: string; content: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function CreatePostDialog({ onSubmit, isSubmitting }: CreatePostDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    await onSubmit({
      title: title.trim() || undefined,
      content: content.trim(),
    });
    
    setTitle('');
    setContent('');
    setOpen(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-3 w-full p-2 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 text-sm text-muted-foreground">
            Nova publicação...
          </span>
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova publicação</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <Input
            placeholder="Título (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-medium"
          />
          
          <Textarea
            placeholder="O que você quer compartilhar com sua equipe?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
            autoFocus
          />
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Publicar no feed do workspace
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              size="sm"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Publicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
