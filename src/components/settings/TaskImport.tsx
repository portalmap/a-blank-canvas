import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";

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

export function TaskImport() {
  const { activeWorkspace } = useWorkspace();
  const [jsonInput, setJsonInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    if (!activeWorkspace?.id) {
      toast.error("Selecione um workspace primeiro");
      return;
    }

    if (!jsonInput.trim()) {
      toast.error("Cole os dados das tarefas no campo acima");
      return;
    }

    let tasks: ImportTask[];
    try {
      tasks = JSON.parse(jsonInput);
      if (!Array.isArray(tasks)) {
        throw new Error("Os dados devem ser um array de tarefas");
      }
    } catch {
      toast.error("JSON inválido. Verifique o formato dos dados.");
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

  const exampleJson = `[
  {
    "title": "Nome da tarefa",
    "description": "Descrição opcional",
    "status": "to do",
    "priority": "medium",
    "assignees": ["Beatriz Santos", "Mirian Vilivas"],
    "listName": "Plan. Social Media | Accerth",
    "dueDate": "2025-01-15",
    "startDate": "2025-01-10"
  }
]`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar Tarefas</CardTitle>
          <CardDescription>
            Cole os dados das tarefas em formato JSON para importá-las em lote.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Listas disponíveis para importação:</h4>
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
              <li>revisão → Em Progresso</li>
              <li>aguardando feedback → Env. Aprovação</li>
              <li>demanda sem prazo → A Fazer</li>
              <li>devolução de aprovação → Em Progresso</li>
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

          <div>
            <h4 className="text-sm font-medium mb-2">Exemplo de formato:</h4>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
              {exampleJson}
            </pre>
          </div>

          <Textarea
            placeholder="Cole o JSON das tarefas aqui..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />

          <Button 
            onClick={handleImport} 
            disabled={isImporting || !jsonInput.trim()}
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
                Importar Tarefas
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
