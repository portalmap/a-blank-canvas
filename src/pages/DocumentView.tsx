import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Star, 
  BookOpen, 
  MoreHorizontal, 
  Share2, 
  Archive, 
  Trash2,
  Lock,
  Unlock,
  Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';
import { ShareDocumentDialog } from '@/components/documents/ShareDocumentDialog';
import { RichTextEditor } from '@/components/documents/editor';

const EMOJI_OPTIONS = ['📄', '📝', '📋', '📌', '📎', '📂', '🗂️', '📑', '📒', '📓', '💡', '🎯', '🚀', '⭐', '🔖'];

const DocumentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emoji, setEmoji] = useState('📄');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: isFavorited } = useQuery({
    queryKey: ['document-favorite', id, user?.id],
    queryFn: async () => {
      if (!id || !user?.id) return false;
      
      const { data } = await supabase
        .from('document_favorites')
        .select('id')
        .eq('document_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      return !!data;
    },
    enabled: !!id && !!user?.id,
  });

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setEmoji(document.emoji || '📄');
      const contentObj = document.content as { text?: string; type?: string } | null;
      // Support both legacy text format and new TipTap JSON format
      if (contentObj?.type === 'doc') {
        setContent(JSON.stringify(contentObj));
      } else if (contentObj?.text !== undefined) {
        setContent(JSON.stringify({ text: contentObj.text }));
      } else if (typeof document.content === 'string') {
        setContent(document.content);
      } else {
        setContent('');
      }
    }
  }, [document]);

  const updateDocument = useMutation({
    mutationFn: async (data: { title?: string; emoji?: string; content?: Json; is_protected?: boolean; is_wiki?: boolean; visibility?: string }) => {
      if (!id) throw new Error('Document ID missing');
      
      const { error } = await supabase
        .from('documents')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setHasChanges(false);
      toast.success('Documento salvo!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!id || !user?.id) throw new Error('Missing data');

      if (isFavorited) {
        const { error } = await supabase
          .from('document_favorites')
          .delete()
          .eq('document_id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('document_favorites')
          .insert({ document_id: id, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-favorite', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const archiveDocument = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Document ID missing');
      
      const { error } = await supabase
        .from('documents')
        .update({ is_archived: !document?.is_archived })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(document?.is_archived ? 'Documento restaurado!' : 'Documento arquivado!');
      if (!document?.is_archived) navigate('/documents');
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Document ID missing');
      
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Documento excluído!');
      navigate('/documents');
    },
  });

  const handleSave = () => {
    // Parse content to check if it's TipTap format
    let contentToSave: Json;
    try {
      const parsed = JSON.parse(content);
      if (parsed.type === 'doc') {
        contentToSave = parsed as Json;
      } else {
        contentToSave = { text: content } as Json;
      }
    } catch {
      contentToSave = { text: content } as Json;
    }
    
    updateDocument.mutate({
      title,
      emoji,
      content: contentToSave,
    });
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setHasChanges(true);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(true);
  };

  const handleEmojiSelect = (selectedEmoji: string) => {
    setEmoji(selectedEmoji);
    setShowEmojiPicker(false);
    setHasChanges(true);
  };

  const isOwner = document?.created_by_user_id === user?.id;

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-12 w-2/3 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <h2 className="text-xl font-semibold mb-2">Documento não encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/documents')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Documentos
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Top Toolbar */}
      <div className="border-b px-4 py-2 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/documents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Documentos</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium truncate max-w-[200px]">{document.title}</span>
          {document.is_wiki && (
            <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">
              <BookOpen className="h-3 w-3" />
              Wiki
            </span>
          )}
          {document.is_protected && (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={updateDocument.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleFavorite.mutate()}
          >
            <Star className={`h-4 w-4 ${isFavorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setShareDialogOpen(true)}>
            <Share2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => updateDocument.mutate({ is_wiki: !document.is_wiki })}
                disabled={!isOwner}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                {document.is_wiki ? 'Remover como Wiki' : 'Marcar como Wiki'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateDocument.mutate({ is_protected: !document.is_protected })}
                disabled={!isOwner}
              >
                {document.is_protected ? (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Desproteger
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Proteger
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => archiveDocument.mutate()} disabled={!isOwner}>
                <Archive className="h-4 w-4 mr-2" />
                {document.is_archived ? 'Restaurar' : 'Arquivar'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => deleteDocument.mutate()}
                className="text-destructive"
                disabled={!isOwner}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-8 px-6">
          {/* Emoji + Title */}
          <div className="flex items-start gap-4 mb-8">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-5xl hover:bg-muted rounded-lg p-2 transition-colors"
                disabled={document.is_protected}
              >
                {emoji}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 bg-popover border rounded-lg shadow-lg p-3 z-10">
                  <div className="grid grid-cols-5 gap-2">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        onClick={() => handleEmojiSelect(e)}
                        className="text-2xl hover:bg-muted rounded p-1 transition-colors"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Sem título"
              className="text-4xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
              disabled={document.is_protected}
            />
          </div>

          {/* Content Editor */}
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            disabled={document.is_protected}
            placeholder="Comece a escrever ou digite / para comandos..."
          />
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDocumentDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        documentId={id || ''}
        documentTitle={document.title}
        visibility={document.visibility || 'private'}
        publicLinkId={document.public_link_id || ''}
        onVisibilityChange={(visibility) => updateDocument.mutate({ visibility })}
      />
    </div>
  );
};

export default DocumentView;
