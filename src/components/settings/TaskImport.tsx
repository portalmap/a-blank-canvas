import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle, XCircle, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImportTask {
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignees: string[];
  listName: string;
  dueDate?: string;
  startDate?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// Status inativos que devem ser ignorados
const INACTIVE_STATUSES = [
  "concluído",
  "concluido",
  "cancelled",
  "cancelado",
  "finalizado",
  "postado/entregue",
  "postado",
  "entregue",
];

// Listas suportadas
const SUPPORTED_LISTS = [
  "Plan. Social Media | Accerth",
  "Plan. de Criativos | Accerth",
  "Designer | Accerth",
  "Designer/Edição de Vídeo | Accerth",
];

function timestampToDate(timestamp: string | number | null): string | null {
  if (!timestamp) return null;
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  if (isNaN(ts) || ts === 0) return null;
  const date = new Date(ts);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

function parseAssignees(assigneesStr: string): string[] {
  if (!assigneesStr) return [];
  const cleaned = assigneesStr.replace(/^\[|\]$/g, '').replace(/"/g, '');
  if (!cleaned) return [];
  return cleaned.split(',').map(a => a.trim()).filter(Boolean);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
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
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseCSV(csvContent: string): ImportTask[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const tasks: ImportTask[] = [];
  
  // Processar cada linha (pular cabeçalho)
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    // Índices baseados no cabeçalho do CSV
    // Task ID, Task Name, Task Content, Status, Date Created, Date Created Text, Due Date, Due Date Text, Start Date, Start Date Text, Parent ID, Attachments, Assignees, Tags, Priority, List Name, ...
    const taskName = values[1]?.replace(/^"|"$/g, '');
    const taskContent = values[2]?.replace(/^"|"$/g, '');
    const status = values[3]?.replace(/^"|"$/g, '').toLowerCase();
    const dueDate = values[6];
    const startDate = values[8];
    const assigneesRaw = values[12];
    const priority = values[14]?.replace(/^"|"$/g, '');
    const listName = values[15]?.replace(/^"|"$/g, '');
    
    // Pular se não tem nome ou lista
    if (!taskName || !listName) continue;
    
    // Pular se status é inativo
    if (INACTIVE_STATUSES.some(s => status?.includes(s))) continue;
    
    // Pular se lista não é suportada
    if (!SUPPORTED_LISTS.includes(listName)) continue;
    
    tasks.push({
      title: taskName,
      description: taskContent || undefined,
      status: status || 'to do',
      priority: priority || 'medium',
      assignees: parseAssignees(assigneesRaw || ''),
      listName: listName,
      dueDate: timestampToDate(dueDate) || undefined,
      startDate: timestampToDate(startDate) || undefined,
    });
  }
  
  return tasks;
}

export function TaskImport() {
  const { activeWorkspace } = useWorkspace();
  const [jsonInput, setJsonInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsedTasks, setParsedTasks] = useState<ImportTask[]>([]);
  const [activeTab, setActiveTab] = useState("csv");

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const tasks = parseCSV(content);
      setParsedTasks(tasks);
      setJsonInput(JSON.stringify(tasks, null, 2));
      toast.success(`${tasks.length} tarefas ativas encontradas no CSV`);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!activeWorkspace?.id) {
      toast.error("Selecione um workspace primeiro");
      return;
    }

    let tasks: ImportTask[];
    
    if (activeTab === "csv" && parsedTasks.length > 0) {
      tasks = parsedTasks;
    } else {
      if (!jsonInput.trim()) {
        toast.error("Cole os dados das tarefas ou faça upload do CSV");
        return;
      }

      try {
        tasks = JSON.parse(jsonInput);
        if (!Array.isArray(tasks)) {
          throw new Error("Os dados devem ser um array de tarefas");
        }
      } catch {
        toast.error("JSON inválido. Verifique o formato dos dados.");
        return;
      }
    }

    if (tasks.length === 0) {
      toast.error("Nenhuma tarefa para importar");
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("import-tasks", {
        body: {
          tasks,
          workspaceId: activeWorkspace.id,
        },
      });

      if (error) throw error;

      setResult(data.results);
      
      if (data.results.imported > 0) {
        toast.success(`${data.results.imported} tarefas importadas com sucesso!`);
      }
      if (data.results.skipped > 0) {
        toast.warning(`${data.results.skipped} tarefas foram ignoradas`);
      }
    } catch (error) {
      console.error("Erro na importação:", error);
      toast.error("Erro ao importar tarefas");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar Tarefas do ClickUp</CardTitle>
          <CardDescription>
            Faça upload do arquivo CSV exportado do ClickUp ou cole os dados em JSON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">Upload CSV</TabsTrigger>
              <TabsTrigger value="json">Colar JSON</TabsTrigger>
            </TabsList>
            
            <TabsContent value="csv" className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Selecione o arquivo CSV:</h4>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>
              
              {parsedTasks.length > 0 && (
                <div className="bg-muted/50 p-4 rounded-md">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">{parsedTasks.length} tarefas prontas para importar</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-1">Resumo por lista:</p>
                    <ul className="list-disc list-inside">
                      {Object.entries(
                        parsedTasks.reduce((acc, task) => {
                          acc[task.listName] = (acc[task.listName] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([list, count]) => (
                        <li key={list}>{list}: {count} tarefas</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="json" className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Listas disponíveis:</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  <li>Plan. Social Media | Accerth</li>
                  <li>Plan. de Criativos | Accerth</li>
                  <li>Designer | Accerth</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Status suportados:</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside grid grid-cols-2 gap-1">
                  <li>to do → A Fazer</li>
                  <li>em andamento → Em Progresso</li>
                  <li>aguardando aprovação → Env. Aprovação</li>
                  <li>planejar postagem → Planejar Postagem</li>
                  <li>em produção → Em Progresso</li>
                  <li>demanda sem prazo → Aguardando</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Usuários mapeados:</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  <li>Beatriz Santos</li>
                  <li>Mirian Vilivas</li>
                  <li>Wendy Uda</li>
                  <li>Dionatas Florêncio → João Luiz</li>
                </ul>
              </div>

              <Textarea
                placeholder="Cole o JSON das tarefas aqui..."
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </TabsContent>
          </Tabs>

          <Button 
            onClick={handleImport} 
            disabled={isImporting || (activeTab === "csv" ? parsedTasks.length === 0 : !jsonInput.trim())}
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar {activeTab === "csv" && parsedTasks.length > 0 ? `${parsedTasks.length} Tarefas` : "Tarefas"}
              </>
            )}
          </Button>

          {result && (
            <Card className="mt-4">
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">{result.imported} importadas</span>
                  </div>
                  {result.skipped > 0 && (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">{result.skipped} ignoradas</span>
                    </div>
                  )}
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-destructive mb-1">Erros:</h5>
                    <ul className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>... e mais {result.errors.length - 10} erros</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}