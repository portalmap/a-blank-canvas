import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Link, 
  Copy, 
  Check, 
  Users, 
  Globe, 
  Lock,
  Trash2,
  UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  visibility: string;
  publicLinkId: string;
  onVisibilityChange: (visibility: string) => void;
}

export const ShareDocumentDialog = ({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  visibility,
  publicLinkId,
  onVisibilityChange,
}: ShareDocumentDialogProps) => {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'commenter' | 'editor'>('viewer');

  const publicLink = `${window.location.origin}/documents/public/${publicLinkId}`;

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['document-permissions', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_permissions')
        .select(`
          id,
          role,
          user_id,
          team_id
        `)
        .eq('document_id', documentId);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!documentId,
  });

  const addPermission = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // First, get user id from email
      const { data: userData, error: userError } = await supabase
        .rpc('get_user_id_by_email', { email });

      if (userError || !userData) {
        throw new Error('Usuário não encontrado com este email');
      }

      const { error } = await supabase
        .from('document_permissions')
        .insert({
          document_id: documentId,
          user_id: userData,
          role: role as 'viewer' | 'commenter' | 'editor',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-permissions', documentId] });
      setEmail('');
      toast.success('Permissão adicionada!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removePermission = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from('document_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-permissions', documentId] });
      toast.success('Permissão removida!');
    },
  });

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddPermission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    addPermission.mutate({ email: email.trim(), role });
  };

  const getVisibilityIcon = () => {
    switch (visibility) {
      case 'link':
        return <Globe className="h-4 w-4" />;
      case 'shared':
        return <Users className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  const getVisibilityLabel = () => {
    switch (visibility) {
      case 'link':
        return 'Qualquer pessoa com o link';
      case 'shared':
        return 'Pessoas específicas';
      default:
        return 'Privado (só você)';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartilhar "{documentTitle}"</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="people">Pessoas</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Visibility Selector */}
            <div className="space-y-2">
              <Label>Quem pode acessar</Label>
              <Select value={visibility} onValueChange={onVisibilityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Privado (só você)
                    </div>
                  </SelectItem>
                  <SelectItem value="link">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Qualquer pessoa com o link
                    </div>
                  </SelectItem>
                  <SelectItem value="shared">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Apenas pessoas adicionadas
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Public Link */}
            {visibility === 'link' && (
              <div className="space-y-2">
                <Label>Link público</Label>
                <div className="flex gap-2">
                  <Input
                    value={publicLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Qualquer pessoa com este link pode visualizar o documento.
                </p>
              </div>
            )}

            {/* Current Access Summary */}
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                {getVisibilityIcon()}
                <span className="font-medium text-sm">{getVisibilityLabel()}</span>
              </div>
              {permissions && permissions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  + {permissions.length} pessoa(s) com acesso direto
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="people" className="space-y-4 mt-4">
            {/* Add Person Form */}
            <form onSubmit={handleAddPermission} className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Email do usuário..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
                <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Visualizar</SelectItem>
                    <SelectItem value="commenter">Comentar</SelectItem>
                    <SelectItem value="editor">Editar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="submit" 
                size="sm" 
                disabled={!email.trim() || addPermission.isPending}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </form>

            {/* People with Access */}
            <div className="space-y-2">
              <Label>Pessoas com acesso</Label>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : permissions && permissions.length > 0 ? (
                <div className="space-y-2">
                  {permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between p-2 rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {perm.user_id ? 'Usuário' : 'Equipe'}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {perm.role === 'viewer' && 'Visualizador'}
                            {perm.role === 'commenter' && 'Comentador'}
                            {perm.role === 'editor' && 'Editor'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePermission.mutate(perm.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                  Nenhuma pessoa adicionada ainda
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
