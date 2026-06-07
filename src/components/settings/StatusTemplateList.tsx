import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, MoreHorizontal, Pencil, Copy, Trash2, FileStack } from 'lucide-react';
import { 
  useStatusTemplates, 
  useDeleteStatusTemplate, 
  useDuplicateStatusTemplate 
} from '@/hooks/useStatusTemplates';
import { StatusApplicationDialog } from './StatusApplicationDialog';

interface StatusTemplateListProps {
  workspaceId: string;
  onEdit: (templateId: string) => void;
}

export function StatusTemplateList({ workspaceId, onEdit }: StatusTemplateListProps) {
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);

  const { data: templates, isLoading } = useStatusTemplates(workspaceId);
  const deleteTemplate = useDeleteStatusTemplate();
  const duplicateTemplate = useDuplicateStatusTemplate();

  const filteredTemplates = templates?.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar modelos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 text-sm">
          {search ? 'Nenhum modelo encontrado' : 'Nenhum modelo criado ainda'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1">
                  {template.status_template_items?.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="w-3 h-3 rounded-full border-2 border-background"
                      style={{ backgroundColor: item.color || '#94a3b8' }}
                    />
                  ))}
                </div>
                <div>
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.status_template_items?.length || 0} status
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(template.id)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setApplyTemplateId(template.id)}>
                    <FileStack className="h-4 w-4 mr-2" />
                    Aplicar em locais
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicateTemplate.mutate(template.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDeleteId(template.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O modelo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteTemplate.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StatusApplicationDialog
        templateId={applyTemplateId}
        workspaceId={workspaceId}
        open={!!applyTemplateId}
        onOpenChange={() => setApplyTemplateId(null)}
      />
    </div>
  );
}
