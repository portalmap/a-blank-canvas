import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpaces } from '@/hooks/useSpaces';
import { useLists } from '@/hooks/useLists';
import { CSVUploadStep } from '@/components/tasks/import/CSVUploadStep';
import { CSVMappingStep } from '@/components/tasks/import/CSVMappingStep';
import { CSVPreviewStep } from '@/components/tasks/import/CSVPreviewStep';
import { useCSVImport } from '@/components/tasks/import/useCSVImport';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';

type ImportStep = 'select-destination' | 'upload' | 'mapping' | 'preview';

export const ImportSettings = () => {
  const { activeWorkspace } = useWorkspace();
  const { data: spaces, isLoading: isLoadingSpaces } = useSpaces(activeWorkspace?.id);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [importStep, setImportStep] = useState<ImportStep>('select-destination');

  const { data: lists, isLoading: isLoadingLists } = useLists({ spaceId: selectedSpaceId || undefined });

  const {
    step,
    setStep,
    columns,
    mappings,
    parsedTasks,
    isImporting,
    handleFileUpload,
    updateMapping,
    processMappings,
    executeImport,
    reset,
  } = useCSVImport(selectedListId, activeWorkspace?.id || '');

  const handleSpaceChange = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    setSelectedListId('');
  };

  const handleStartImport = () => {
    if (selectedListId) {
      setImportStep('upload');
    }
  };

  const handleImportComplete = async () => {
    const result = await executeImport();
    if (result.created > 0) {
      // Reset everything after successful import
      reset();
      setImportStep('select-destination');
      setSelectedSpaceId('');
      setSelectedListId('');
    }
  };

  const handleBackToDestination = () => {
    reset();
    setImportStep('select-destination');
  };

  // Sync internal step with importStep
  const currentStep = importStep === 'select-destination' ? 'select-destination' : step;

  if (!activeWorkspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Importação de Tarefas</CardTitle>
          <CardDescription>Selecione um workspace para continuar</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importação de Tarefas via CSV
        </CardTitle>
        <CardDescription>
          Importe tarefas em massa a partir de um arquivo CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {importStep === 'select-destination' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="space-select">Space de destino</Label>
                <Select
                  value={selectedSpaceId}
                  onValueChange={handleSpaceChange}
                  disabled={isLoadingSpaces}
                >
                  <SelectTrigger id="space-select">
                    <SelectValue placeholder="Selecione um Space..." />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces?.map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {spaces?.length === 0 && !isLoadingSpaces && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum Space encontrado. Crie um Space primeiro.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="list-select">Lista de destino</Label>
                <Select
                  value={selectedListId}
                  onValueChange={setSelectedListId}
                  disabled={!selectedSpaceId || isLoadingLists}
                >
                  <SelectTrigger id="list-select">
                    <SelectValue placeholder="Selecione uma Lista..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lists?.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSpaceId && lists?.length === 0 && !isLoadingLists && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma Lista encontrada neste Space. Crie uma Lista primeiro.
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleStartImport}
              disabled={!selectedListId}
              className="w-full"
            >
              Continuar para Upload
            </Button>
          </div>
        )}

        {importStep !== 'select-destination' && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDestination}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para seleção de destino
            </Button>

            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Destino: </span>
                <span className="font-medium">
                  {spaces?.find(s => s.id === selectedSpaceId)?.name} → {lists?.find(l => l.id === selectedListId)?.name}
                </span>
              </p>
            </div>

            {currentStep === 'upload' && (
              <CSVUploadStep onFileSelect={handleFileUpload} />
            )}

            {currentStep === 'mapping' && (
              <CSVMappingStep
                columns={columns}
                mappings={mappings}
                onUpdateMapping={updateMapping}
                onBack={() => setStep('upload')}
                onContinue={processMappings}
              />
            )}

            {currentStep === 'preview' && (
              <CSVPreviewStep
                tasks={parsedTasks}
                isImporting={isImporting}
                onBack={() => setStep('mapping')}
                onImport={handleImportComplete}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
