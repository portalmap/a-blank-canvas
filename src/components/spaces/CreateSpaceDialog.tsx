import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useSpaceTemplatesWithStructure, useApplySpaceTemplate } from '@/hooks/useSpaceTemplates';
import { useCreateSpace } from '@/hooks/useSpaces';
import { Loader2, FolderPlus, FileStack, Check, ArrowLeft } from 'lucide-react';

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

type Step = 'choose' | 'template' | 'form';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', 
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export const CreateSpaceDialog = ({ open, onOpenChange, workspaceId }: CreateSpaceDialogProps) => {
  const [step, setStep] = useState<Step>('choose');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [spaceColor, setSpaceColor] = useState('#6366f1');

  // Busca TODOS os templates globais
  const { data: templates } = useSpaceTemplatesWithStructure();
  const createSpace = useCreateSpace();
  const applyTemplate = useApplySpaceTemplate();

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  const resetForm = () => {
    setStep('choose');
    setSelectedTemplateId(null);
    setSpaceName('');
    setSpaceDescription('');
    setSpaceColor('#6366f1');
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 200);
  };

  const handleCreateFromScratch = () => {
    setStep('form');
  };

  const handleUseTemplate = () => {
    setStep('template');
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      // When using template, clear name so user enters only company name
      setSpaceName('');
      setSpaceColor(template.color || '#6366f1');
    }
    setStep('form');
  };

  const handleCreate = async () => {
    if (!spaceName.trim()) return;

    if (selectedTemplateId && selectedTemplate) {
      // Build final space name: template base name + company name
      // Template name is "MAP | ", user enters "King Talhas"
      // Final name is "MAP | King Talhas"
      const finalSpaceName = `${selectedTemplate.name.trim()}${spaceName.trim()}`;
      
      await applyTemplate.mutateAsync({
        templateId: selectedTemplateId,
        workspaceId,
        spaceName: finalSpaceName,
        spaceDescription: spaceDescription || undefined,
        spaceColor,
      });
    } else {
      await createSpace.mutateAsync({
        workspaceId,
        name: spaceName,
        description: spaceDescription || undefined,
        color: spaceColor,
      });
    }

    handleClose();
  };

  const isPending = createSpace.isPending || applyTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== 'choose' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setStep(step === 'form' && selectedTemplateId ? 'template' : 'choose')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            Criar Novo Space
          </DialogTitle>
          <DialogDescription>
            {step === 'choose' && 'Escolha como você quer criar seu Space'}
            {step === 'template' && 'Selecione um template para começar'}
            {step === 'form' && (selectedTemplateId ? `Usando template: ${selectedTemplate?.name}` : 'Configure seu novo Space')}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={handleCreateFromScratch}
            >
              <CardContent className="flex flex-col items-center justify-center p-6">
                <FolderPlus className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-center">Criar do Zero</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Space vazio para personalizar
                </p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:border-primary transition-colors ${!templates?.length ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={handleUseTemplate}
            >
              <CardContent className="flex flex-col items-center justify-center p-6">
                <FileStack className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-center">Usar Template</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {templates?.length ? `${templates.length} template${templates.length > 1 ? 's' : ''} disponível` : 'Nenhum template'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'template' && (
          <div className="space-y-3 py-4 max-h-80 overflow-y-auto">
            {templates?.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer hover:border-primary transition-colors ${selectedTemplateId === template.id ? 'border-primary' : ''}`}
                onClick={() => handleSelectTemplate(template.id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: template.color || '#6366f1' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{template.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {template.folderCount} pasta{template.folderCount !== 1 ? 's' : ''}, {' '}
                      {template.listCount} lista{template.listCount !== 1 ? 's' : ''}, {' '}
                      {template.taskCount} tarefa{template.taskCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {selectedTemplateId === template.id && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {selectedTemplateId ? 'Nome da Empresa' : 'Nome'}
              </Label>
              <Input
                id="name"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder={selectedTemplateId 
                  ? "Ex: King Talhas, Accerth" 
                  : "Ex: Projetos, Marketing, Vendas"
                }
              />
              {selectedTemplateId && selectedTemplate && (
                <p className="text-xs text-muted-foreground">
                  O nome será usado em: {selectedTemplate.name}{spaceName || '[empresa]'}, 
                  pastas e listas seguirão o mesmo padrão
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={spaceDescription}
                onChange={(e) => setSpaceDescription(e.target.value)}
                placeholder="Descreva o propósito deste space"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded-full transition-all ${spaceColor === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setSpaceColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'form' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!spaceName.trim() || isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedTemplateId ? 'Criar com Template' : 'Criar Space'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
