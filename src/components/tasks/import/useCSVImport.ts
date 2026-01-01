import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type SystemField = 
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'start_date'
  | 'due_date'
  | 'assignees'
  | 'tags'
  | 'ignore';

export interface CSVColumn {
  name: string;
  sampleValues: string[];
}

export interface ColumnMapping {
  csvColumn: string;
  systemField: SystemField | null;
}

export interface ParsedTask {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  start_date?: string;
  due_date?: string;
  assignees?: string[];
  tags?: string[];
  warnings: string[];
}

export interface ImportResult {
  created: number;
  warnings: number;
  errors: string[];
}

export const SYSTEM_FIELDS: { value: SystemField; label: string; required?: boolean }[] = [
  { value: 'title', label: 'Nome da Tarefa', required: true },
  { value: 'description', label: 'Descrição' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'start_date', label: 'Data de Início' },
  { value: 'due_date', label: 'Data de Entrega' },
  { value: 'assignees', label: 'Responsáveis' },
  { value: 'tags', label: 'Tags' },
  { value: 'ignore', label: 'Ignorar Coluna' },
];

export const useCSVImport = (listId: string, workspaceId: string) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columns, setColumns] = useState<CSVColumn[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const parseCSV = useCallback((content: string): string[][] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const result: string[][] = [];
    
    for (const line of lines) {
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((char === ',' || char === ';') && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      result.push(row);
    }
    
    return result;
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSV(content);
      
      if (parsed.length < 2) {
        toast.error('O arquivo CSV deve ter pelo menos uma linha de cabeçalho e uma de dados');
        return;
      }
      
      const headers = parsed[0];
      const dataRows = parsed.slice(1);
      
      setCsvData(parsed);
      
      // Create columns with sample values
      const cols: CSVColumn[] = headers.map((header, index) => ({
        name: header,
        sampleValues: dataRows.slice(0, 3).map(row => row[index] || '').filter(Boolean),
      }));
      
      setColumns(cols);
      
      // Auto-detect mappings based on common column names
      const initialMappings: ColumnMapping[] = cols.map(col => {
        const lowerName = col.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let detected: SystemField | null = null;
        
        if (lowerName.includes('titulo') || lowerName.includes('nome') || lowerName.includes('title') || lowerName.includes('tarefa')) {
          detected = 'title';
        } else if (lowerName.includes('descric') || lowerName.includes('description')) {
          detected = 'description';
        } else if (lowerName.includes('status') || lowerName.includes('estado')) {
          detected = 'status';
        } else if (lowerName.includes('priorid') || lowerName.includes('priority')) {
          detected = 'priority';
        } else if (lowerName.includes('inicio') || lowerName.includes('start')) {
          detected = 'start_date';
        } else if (lowerName.includes('entrega') || lowerName.includes('vencimento') || lowerName.includes('due') || lowerName.includes('prazo')) {
          detected = 'due_date';
        } else if (lowerName.includes('responsav') || lowerName.includes('assignee') || lowerName.includes('atribuido')) {
          detected = 'assignees';
        } else if (lowerName.includes('tag') || lowerName.includes('etiqueta') || lowerName.includes('label')) {
          detected = 'tags';
        }
        
        return { csvColumn: col.name, systemField: detected };
      });
      
      setMappings(initialMappings);
      setStep('mapping');
    };
    
    reader.readAsText(file);
  }, [parseCSV]);

  const updateMapping = useCallback((csvColumn: string, systemField: SystemField | null) => {
    setMappings(prev => prev.map(m => 
      m.csvColumn === csvColumn ? { ...m, systemField } : m
    ));
  }, []);

  const processMappings = useCallback(async () => {
    const titleMapping = mappings.find(m => m.systemField === 'title');
    if (!titleMapping) {
      toast.error('Você precisa mapear a coluna "Nome da Tarefa"');
      return;
    }
    
    const headers = csvData[0];
    const dataRows = csvData.slice(1);
    
    // Get workspace members for assignee matching
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id, profiles:user_id(id, full_name)')
      .eq('workspace_id', workspaceId);
    
    // Get statuses for status matching
    const { data: statuses } = await supabase
      .from('statuses')
      .select('id, name')
      .eq('workspace_id', workspaceId);
    
    // Get tags for tag matching
    const { data: tags } = await supabase
      .from('task_tags')
      .select('id, name')
      .eq('workspace_id', workspaceId);
    
    const tasks: ParsedTask[] = dataRows.map(row => {
      const task: ParsedTask = { title: '', warnings: [] };
      
      mappings.forEach(mapping => {
        if (!mapping.systemField || mapping.systemField === 'ignore') return;
        
        const colIndex = headers.indexOf(mapping.csvColumn);
        const value = row[colIndex]?.trim() || '';
        
        switch (mapping.systemField) {
          case 'title':
            task.title = value;
            break;
          case 'description':
            task.description = value;
            break;
          case 'status':
            task.status = value;
            if (value && !statuses?.find(s => s.name.toLowerCase() === value.toLowerCase())) {
              task.warnings.push(`Status "${value}" não encontrado`);
            }
            break;
          case 'priority':
            task.priority = value;
            break;
          case 'start_date':
            task.start_date = value;
            break;
          case 'due_date':
            task.due_date = value;
            break;
          case 'assignees':
            if (value) {
              const names = value.split(/[,;]/).map(n => n.trim()).filter(Boolean);
              task.assignees = names;
              names.forEach(name => {
                const found = members?.find(m => 
                  (m.profiles as any)?.full_name?.toLowerCase() === name.toLowerCase()
                );
                if (!found) {
                  task.warnings.push(`Responsável "${name}" não encontrado`);
                }
              });
            }
            break;
          case 'tags':
            if (value) {
              const tagNames = value.split(/[,;]/).map(t => t.trim()).filter(Boolean);
              task.tags = tagNames;
            }
            break;
        }
      });
      
      return task;
    }).filter(task => task.title);
    
    setParsedTasks(tasks);
    setStep('preview');
  }, [csvData, mappings, workspaceId]);

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Try common date formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
      }
    }
    
    // Try native Date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  };

  const normalizePriority = (priority: string): 'low' | 'medium' | 'high' | 'urgent' => {
    const lower = priority.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes('baixa') || lower.includes('low')) return 'low';
    if (lower.includes('alta') || lower.includes('high')) return 'high';
    if (lower.includes('urgente') || lower.includes('urgent')) return 'urgent';
    return 'medium';
  };

  const executeImport = useCallback(async (): Promise<ImportResult> => {
    setIsImporting(true);
    const result: ImportResult = { created: 0, warnings: 0, errors: [] };
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      // Get statuses and default status
      const { data: statuses } = await supabase
        .from('statuses')
        .select('id, name, is_default')
        .eq('workspace_id', workspaceId);
      
      const defaultStatus = statuses?.find(s => s.is_default) || statuses?.[0];
      if (!defaultStatus) throw new Error('Nenhum status encontrado no workspace');
      
      // Get members for assignee matching
      const { data: members } = await supabase
        .from('workspace_members')
        .select('user_id, profiles:user_id(id, full_name)')
        .eq('workspace_id', workspaceId);
      
      // Get existing tags
      const { data: existingTags } = await supabase
        .from('task_tags')
        .select('id, name')
        .eq('workspace_id', workspaceId);
      
      for (const task of parsedTasks) {
        try {
          // Find status
          let statusId = defaultStatus.id;
          if (task.status) {
            const found = statuses?.find(s => 
              s.name.toLowerCase() === task.status!.toLowerCase()
            );
            if (found) statusId = found.id;
          }
          
          // Parse dates
          const startDate = task.start_date ? parseDate(task.start_date) : null;
          const dueDate = task.due_date ? parseDate(task.due_date) : null;
          
          // Create task
          const { data: newTask, error: taskError } = await supabase
            .from('tasks')
            .insert({
              title: task.title,
              description: task.description || null,
              list_id: listId,
              workspace_id: workspaceId,
              status_id: statusId,
              priority: task.priority ? normalizePriority(task.priority) : 'medium',
              start_date: startDate,
              due_date: dueDate,
              created_by_user_id: user.id,
            })
            .select('id')
            .single();
          
          if (taskError) {
            result.errors.push(`Erro ao criar "${task.title}": ${taskError.message}`);
            continue;
          }
          
          // Add assignees
          if (task.assignees && task.assignees.length > 0) {
            for (const assigneeName of task.assignees) {
              const member = members?.find(m => 
                (m.profiles as any)?.full_name?.toLowerCase() === assigneeName.toLowerCase()
              );
              if (member) {
                await supabase
                  .from('task_assignees')
                  .insert({
                    task_id: newTask.id,
                    user_id: member.user_id,
                  });
              }
            }
          }
          
          // Add tags
          if (task.tags && task.tags.length > 0) {
            for (const tagName of task.tags) {
              let tagId = existingTags?.find(t => 
                t.name.toLowerCase() === tagName.toLowerCase()
              )?.id;
              
              // Create tag if not exists
              if (!tagId) {
                const { data: newTag } = await supabase
                  .from('task_tags')
                  .insert({
                    name: tagName,
                    workspace_id: workspaceId,
                  })
                  .select('id')
                  .single();
                tagId = newTag?.id;
              }
              
              if (tagId) {
                await supabase
                  .from('task_tag_relations')
                  .insert({
                    task_id: newTask.id,
                    tag_id: tagId,
                  });
              }
            }
          }
          
          result.created++;
          if (task.warnings.length > 0) result.warnings++;
          
        } catch (err: any) {
          result.errors.push(`Erro ao criar "${task.title}": ${err.message}`);
        }
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-with-assignees'] });
      
      toast.success(`${result.created} tarefas importadas com sucesso`);
      
    } catch (err: any) {
      result.errors.push(err.message);
      toast.error('Erro durante a importação');
    } finally {
      setIsImporting(false);
    }
    
    return result;
  }, [parsedTasks, listId, workspaceId, queryClient]);

  const reset = useCallback(() => {
    setStep('upload');
    setCsvData([]);
    setColumns([]);
    setMappings([]);
    setParsedTasks([]);
  }, []);

  return {
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
  };
};
