import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreatePostFormProps {
  onSubmit: (data: { title?: string; content: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function CreatePostForm({ onSubmit, isSubmitting }: CreatePostFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showTitleInput, setShowTitleInput] = useState(false);

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
    setShowTitleInput(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {getInitials(profile?.full_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-3">
          {showTitleInput && (
            <Input
              placeholder="Título (opcional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium"
            />
          )}
          
          <Textarea
            placeholder="O que você quer compartilhar com sua equipe?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none"
            onFocus={() => setShowTitleInput(true)}
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
      </div>
    </div>
  );
}
