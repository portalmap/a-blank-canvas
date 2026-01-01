import { ArrowRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CSVColumn, ColumnMapping, SystemField, SYSTEM_FIELDS } from './useCSVImport';
import { cn } from '@/lib/utils';

interface CSVMappingStepProps {
  columns: CSVColumn[];
  mappings: ColumnMapping[];
  onUpdateMapping: (csvColumn: string, systemField: SystemField | null) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const CSVMappingStep = ({
  columns,
  mappings,
  onUpdateMapping,
  onBack,
  onContinue,
}: CSVMappingStepProps) => {
  const hasTitleMapping = mappings.some(m => m.systemField === 'title');
  
  // Check which system fields are already used
  const usedFields = mappings
    .filter(m => m.systemField && m.systemField !== 'ignore')
    .map(m => m.systemField);

  const getAvailableFields = (currentField: SystemField | null) => {
    return SYSTEM_FIELDS.filter(f => 
      f.value === currentField || 
      f.value === 'ignore' || 
      !usedFields.includes(f.value)
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">Mapear colunas</h3>
        <p className="text-sm text-muted-foreground">
          Conecte cada coluna do seu CSV com o campo correspondente no sistema.
          <br />
          <span className="text-primary">O campo "Nome da Tarefa" é obrigatório.</span>
        </p>
      </div>

      <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
        {columns.map((column, index) => {
          const mapping = mappings.find(m => m.csvColumn === column.name);
          const systemField = mapping?.systemField;
          const isTitle = systemField === 'title';
          const isIgnored = systemField === 'ignore';
          
          return (
            <div
              key={column.name}
              className={cn(
                "flex items-center gap-4 p-4 transition-colors",
                isIgnored && "opacity-50 bg-muted/30"
              )}
            >
              {/* CSV Column */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{column.name}</span>
                  {isTitle && (
                    <Badge variant="default" className="shrink-0">
                      <Check className="h-3 w-3 mr-1" />
                      Obrigatório
                    </Badge>
                  )}
                </div>
                {column.sampleValues.length > 0 && (
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    Ex: {column.sampleValues.slice(0, 2).join(', ')}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

              {/* System Field Selector */}
              <div className="w-48 shrink-0">
                <Select
                  value={systemField || 'none'}
                  onValueChange={(value) => 
                    onUpdateMapping(column.name, value === 'none' ? null : value as SystemField)
                  }
                >
                  <SelectTrigger className={cn(isTitle && "border-primary")}>
                    <SelectValue placeholder="Selecionar campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Não mapear</span>
                    </SelectItem>
                    {getAvailableFields(systemField).map(field => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                        {field.required && ' *'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      {!hasTitleMapping && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Você precisa mapear uma coluna para "Nome da Tarefa"</span>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onContinue} disabled={!hasTitleMapping}>
          Ver prévia
        </Button>
      </div>
    </div>
  );
};
