import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Plus,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  ImagePlus,
  Paperclip,
  FileText,
  X,
  Eye,
  PenLine,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  type FeedAttachment,
  formatBytes,
  uploadFeedAttachment,
} from '@/lib/feedAttachments';
import { FeedContent } from './FeedContent';
import { DocumentLinkPicker } from './DocumentLinkPicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SUGGESTED_TAGS = ['Comunicado', 'RH', 'Eventos', 'Produto', 'Avisos'];

export interface CreatePostDialogValue {
  title?: string;
  content: string;
  content_format: 'plain' | 'markdown';
  tags: string[];
  attachments: FeedAttachment[];
}

interface CreatePostDialogProps {
  onSubmit: (data: CreatePostDialogValue) => Promise<void>;
  isSubmitting: boolean;
  /** Modo edição: passa post inicial e abre dialog controlado externamente */
  initialPost?: {
    title: string | null;
    content: string;
    content_format: 'plain' | 'markdown';
    tags: string[];
    attachments: FeedAttachment[];
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Esconde o trigger padrão (útil quando aberto externamente). */
  hideTrigger?: boolean;
  /** Estilo do trigger: 'bar' (padrão) com avatar e placeholder, 'compact' apenas botão. */
  triggerVariant?: 'bar' | 'compact';
}

export function CreatePostDialog({
  onSubmit,
  isSubmitting,
  initialPost,
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
  triggerVariant = 'bar',
}: CreatePostDialogProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<FeedAttachment[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset/seed when dialog opens
  useEffect(() => {
    if (!open) return;
    setTitle(initialPost?.title || '');
    setContent(initialPost?.content || '');
    setTags(initialPost?.tags || []);
    setAttachments(initialPost?.attachments || []);
    setPreviewMode(false);
    setTagInput('');
  }, [open, initialPost]);

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

  const wrapSelection = (before: string, after = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = content.slice(start, end);
    const next = content.slice(0, start) + before + sel + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    });
  };

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((c) => c + text);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/,$/, '');
    if (!t) return;
    if (tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput('');
  };

  const handleImagePick = async (files: FileList | null) => {
    if (!files || !activeWorkspace?.id) return;
    setUploading(true);
    try {
      const newAtts: FeedAttachment[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem`);
          continue;
        }
        const up = await uploadFeedAttachment(activeWorkspace.id, file);
        newAtts.push({ kind: 'image', ...up });
      }
      setAttachments([...attachments, ...newAtts]);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFilePick = async (files: FileList | null) => {
    if (!files || !activeWorkspace?.id) return;
    setUploading(true);
    try {
      const newAtts: FeedAttachment[] = [];
      for (const file of Array.from(files)) {
        const up = await uploadFeedAttachment(activeWorkspace.id, file);
        newAtts.push({ kind: 'file', ...up });
      }
      setAttachments([...attachments, ...newAtts]);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await onSubmit({
      title: title.trim() || undefined,
      content: content.trim(),
      content_format: 'markdown',
      tags,
      attachments,
    });
    setTitle('');
    setContent('');
    setTags([]);
    setAttachments([]);
    setOpen(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isEdit = !!initialPost;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
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
      )}

      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar publicação' : 'Nova publicação'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1 overflow-y-auto flex-1 pr-1">
          <Input
            placeholder="Título (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-medium"
          />

          {/* Toolbar */}
          <div className="flex items-center gap-1 flex-wrap border border-border rounded-md p-1 bg-muted/30">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => wrapSelection('**')}
              title="Negrito"
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => wrapSelection('*')}
              title="Itálico"
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => insertAtCursor('\n- ')}
              title="Lista"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                const url = prompt('URL do link:');
                if (url) wrapSelection('[', `](${url})`);
              }}
              title="Link"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              title="Adicionar imagem"
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Anexar arquivo"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
            <DocumentLinkPicker
              onPick={(d) =>
                setAttachments([
                  ...attachments,
                  { kind: 'doc_link', document_id: d.id, title: d.title },
                ])
              }
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Vincular documento do Flow"
                >
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              }
            />

            <div className="ml-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setPreviewMode((v) => !v)}
              >
                {previewMode ? (
                  <>
                    <PenLine className="h-3.5 w-3.5" /> Escrever
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Visualizar
                  </>
                )}
              </Button>
            </div>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImagePick(e.target.files)}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFilePick(e.target.files)}
          />

          {previewMode ? (
            <div className="min-h-[140px] border border-border rounded-md p-3 bg-card">
              {content.trim() ? (
                <FeedContent content={content} format="markdown" />
              ) : (
                <p className="text-sm text-muted-foreground">Nada para visualizar</p>
              )}
            </div>
          ) : (
            <Textarea
              ref={textareaRef}
              placeholder="O que você quer compartilhar com sua equipe? (suporta **markdown**)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[140px] resize-y font-mono text-sm"
              autoFocus
            />
          )}

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30 text-sm"
                >
                  <span className="shrink-0">
                    {att.kind === 'image' && <ImagePlus className="h-4 w-4 text-primary" />}
                    {att.kind === 'file' && <Paperclip className="h-4 w-4 text-primary" />}
                    {att.kind === 'doc_link' && (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                  </span>
                  <span className="flex-1 truncate">
                    {att.kind === 'doc_link' ? att.title : att.name}
                  </span>
                  {att.kind !== 'doc_link' && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatBytes(att.size)}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeAttachment(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                placeholder="Adicionar tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                    setTags(tags.slice(0, -1));
                  }
                }}
                className="h-7 w-32 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full border border-dashed border-border',
                    'hover:bg-accent text-muted-foreground'
                  )}
                  onClick={() => addTag(t)}
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 mt-2">
          <div className="text-xs text-muted-foreground">
            {uploading
              ? 'Enviando anexo...'
              : isEdit
              ? 'Salvar alterações'
              : 'Publicar no feed do workspace'}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting || uploading}
            size="sm"
            className="gap-2"
          >
            {isSubmitting || uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isEdit ? 'Salvar' : 'Publicar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
