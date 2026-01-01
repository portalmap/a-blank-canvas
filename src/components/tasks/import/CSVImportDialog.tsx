import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CSVUploadStep } from './CSVUploadStep';
import { CSVMappingStep } from './CSVMappingStep';
import { CSVPreviewStep } from './CSVPreviewStep';
import { useCSVImport } from './useCSVImport';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  workspaceId: string;
}

export const CSVImportDialog = ({
  open,
  onOpenChange,
  listId,
  workspaceId,
}: CSVImportDialogProps) => {
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
    workspaceId,
    spaceIds: [], // Dialog mode doesn't use multi-space
    autoCreateFolders: true,
    autoCreateLists: true,
  });

  const handleClose = () => {
    if (!isImporting) {
      onOpenChange(false);
      // Reset after dialog closes
      setTimeout(reset, 300);
    }
  };

  const handleImport = async () => {
    const result = await executeImport();
    if (result.created > 0) {
      handleClose();
    }
  };

  const stepTitles = {
    upload: 'Importar CSV',
    mapping: 'Mapear Colunas',
    preview: 'Confirmar Importação',
  };

  const stepDescriptions = {
    upload: 'Envie um arquivo CSV com suas tarefas para importar',
    mapping: 'Conecte as colunas do seu arquivo com os campos do sistema',
    preview: 'Revise e confirme a importação das tarefas',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <DialogDescription>{stepDescriptions[step]}</DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <CSVUploadStep onFileSelect={handleFileUpload} />
        )}

        {step === 'mapping' && (
          <CSVMappingStep
            columns={columns}
            mappings={mappings}
            onUpdateMapping={updateMapping}
            onBack={() => setStep('upload')}
            onContinue={processMappings}
          />
        )}

        {step === 'preview' && (
          <CSVPreviewStep
            tasks={parsedTasks}
            isImporting={isImporting}
            onBack={() => setStep('mapping')}
            onImport={handleImport}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
