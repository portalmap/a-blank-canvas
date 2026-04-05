import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSpaceTemplates, useDuplicateSpaceTemplate } from '@/hooks/useSpaceTemplates';
import { useTemplateAutomations } from '@/hooks/useTemplateAutomations';
import { ApplyTemplateAutomationsDialog } from './ApplyTemplateAutomationsDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, MoreHorizontal, Pencil, Zap, Send, Copy, Type } from 'lucide-react';

interface AutomationTemplateListProps {
  onEdit: (templateId: string) => void;
}

const TemplateRow = ({
  template,
  onEdit,
  onApply,
  onDuplicate,
  onRename,
}: {
  template: { id: string; name: string; color: string | null };
  onEdit: (id: string) => void;
  onApply: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) => {
  const { data: automations = [] } = useTemplateAutomations(template.id);
  const enabledCount = automations.filter(a => a.enabled).length;

  if (automations.length === 0) return null;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: template.color || '#6366f1' }}
        />
        <div>
          <p className="font-medium">{template.name}</p>
          <p className="text-sm text-muted-foreground">
            {automations.length} {automations.length === 1 ? 'automação' : 'automações'}
            {enabledCount < automations.length && (
              <span> ({enabledCount} {enabledCount === 1 ? 'ativa' : 'ativas'})</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          {enabledCount}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename(template.id, template.name)}>
              <Type className="h-4 w-4 mr-2" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(template.id)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar Automações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onApply(template.id)}>
              <Send className="h-4 w-4 mr-2" />
              Aplicar em Spaces
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export const AutomationTemplateList = ({ onEdit }: AutomationTemplateListProps) => {
  const { data: templates, isLoading } = useSpaceTemplates();
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);
  const duplicateTemplate = useDuplicateSpaceTemplate();

  const handleDuplicate = (templateId: string) => {
    duplicateTemplate.mutate(templateId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-lg">
        <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          Nenhum template com automações encontrado.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione automações nos seus templates de Space na aba "Templates".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {templates.map((template) => (
          <TemplateRow
            key={template.id}
            template={template}
            onEdit={onEdit}
            onApply={setApplyTemplateId}
            onDuplicate={handleDuplicate}
          />
        ))}
      </div>

      {applyTemplateId && (
        <ApplyTemplateAutomationsDialog
          open={!!applyTemplateId}
          onOpenChange={(open) => {
            if (!open) setApplyTemplateId(null);
          }}
          templateId={applyTemplateId}
        />
      )}
    </div>
  );
};
