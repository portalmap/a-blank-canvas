import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpaces } from '@/hooks/useSpaces';
import { CSVUploadStep } from '@/components/tasks/import/CSVUploadStep';
import { CSVMappingStep } from '@/components/tasks/import/CSVMappingStep';
import { CSVPreviewStep } from '@/components/tasks/import/CSVPreviewStep';
import { useCSVImport } from '@/components/tasks/import/useCSVImport';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSpreadsheet, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ImportStep = 'upload' | 'configure' | 'mapping' | 'preview';

export const ImportSettings = () => {
  const { activeWorkspace } = useWorkspace();
  const { data: spaces, isLoading: isLoadingSpaces } = useSpaces(activeWorkspace?.id);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [autoCreateFolders, setAutoCreateFolders] = useState(true);
  const [autoCreateLists, setAutoCreateLists] = useState(true);

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
  } = useCSVImport({
    workspaceId: activeWorkspace?.id || '',
    spaceIds: selectedSpaceIds,
    autoCreateFolders,
    autoCreateLists,
  });

  // Sync steps
  useEffect(() => {
    if (step === 'mapping' && importStep === 'upload') {
      setImportStep('configure');
    }
  }, [step, importStep]);

  const handleSpaceToggle = (spaceId: string) => {
    setSelectedSpaceIds(prev => 
      prev.includes(spaceId)
        ? prev.filter(id => id !== spaceId)
        : [...prev, spaceId]
    );
  };

  const handleFileSelected = (file: File) => {
    handleFileUpload(file);
    setImportStep('configure');
  };

  const handleContinueToMapping = () => {
    if (selectedSpaceIds.length > 0) {
      setImportStep('mapping');
    }
  };

  const handleProcessMappings = async () => {
    await processMappings();
    setImportStep('preview');
  };

  const handleImportComplete = async () => {
    const result = await executeImport();
    if (result.created > 0) {
      reset();
      setImportStep('upload');
      setSelectedSpaceIds([]);
    }
  };

  const handleBackToUpload = () => {
    reset();
    setImportStep('upload');
    setSelectedSpaceIds([]);
  };

  const handleBackToConfigure = () => {
    setStep('mapping');
    setImportStep('configure');
  };

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
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={importStep === 'upload' ? 'default' : 'secondary'}>1. Upload</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={importStep === 'configure' ? 'default' : 'secondary'}>2. Configurar</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={importStep === 'mapping' ? 'default' : 'secondary'}>3. Mapear</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={importStep === 'preview' ? 'default' : 'secondary'}>4. Importar</Badge>
        </div>

        {/* Step 1: Upload */}
        {importStep === 'upload' && (
          <CSVUploadStep onFileSelect={handleFileSelected} />
        )}

        {/* Step 2: Configure destination */}
        {importStep === 'configure' && (
          <div className="space-y-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToUpload}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para upload
            </Button>

            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                Arquivo carregado com <span className="font-medium text-foreground">{columns.length} colunas</span> identificadas.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base">Selecione os Spaces de destino</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  As tarefas serão distribuídas nos Spaces selecionados com base no mapeamento de Pasta/Lista do CSV.
                </p>
              </div>

              {isLoadingSpaces ? (
                <p className="text-sm text-muted-foreground">Carregando Spaces...</p>
              ) : spaces?.length === 0 ? (
                <p className="text-sm text-destructive">Nenhum Space encontrado. Crie um Space primeiro.</p>
              ) : (
                <div className="grid gap-2">
                  {spaces?.map((space) => (
                    <div
                      key={space.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedSpaceIds.includes(space.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                      onClick={() => handleSpaceToggle(space.id)}
                    >
                      <Checkbox
                        checked={selectedSpaceIds.includes(space.id)}
                        onCheckedChange={() => handleSpaceToggle(space.id)}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: space.color || '#6b7280' }}
                      />
                      <span className="font-medium">{space.name}</span>
                      {selectedSpaceIds.includes(space.id) && (
                        <Check className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base">Opções de criação automática</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-folders"
                  checked={autoCreateFolders}
                  onCheckedChange={(checked) => setAutoCreateFolders(checked === true)}
                />
                <Label htmlFor="auto-folders" className="text-sm font-normal cursor-pointer">
                  Criar Pastas automaticamente se não existirem
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-lists"
                  checked={autoCreateLists}
                  onCheckedChange={(checked) => setAutoCreateLists(checked === true)}
                />
                <Label htmlFor="auto-lists" className="text-sm font-normal cursor-pointer">
                  Criar Listas automaticamente se não existirem
                </Label>
              </div>
            </div>

            <Button
              onClick={handleContinueToMapping}
              disabled={selectedSpaceIds.length === 0}
              className="w-full"
            >
              Continuar para Mapeamento
            </Button>
          </div>
        )}

        {/* Step 3: Mapping */}
        {importStep === 'mapping' && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToConfigure}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para configuração
            </Button>

            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Destino: </span>
                <span className="font-medium">
                  {selectedSpaceIds.map(id => spaces?.find(s => s.id === id)?.name).filter(Boolean).join(', ')}
                </span>
              </p>
            </div>

            <CSVMappingStep
              columns={columns}
              mappings={mappings}
              onUpdateMapping={updateMapping}
              onBack={handleBackToConfigure}
              onContinue={handleProcessMappings}
            />
          </div>
        )}

        {/* Step 4: Preview */}
        {importStep === 'preview' && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep('mapping');
                setImportStep('mapping');
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para mapeamento
            </Button>

            <CSVPreviewStep
              tasks={parsedTasks}
              isImporting={isImporting}
              onBack={() => {
                setStep('mapping');
                setImportStep('mapping');
              }}
              onImport={handleImportComplete}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
