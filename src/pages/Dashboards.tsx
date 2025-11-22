import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Plus } from 'lucide-react';

const Dashboards = () => {
  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Painéis</h1>
          <p className="text-muted-foreground mt-1">
            Visualize métricas e acompanhe o desempenho da equipe
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Painel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análise de Dados
          </CardTitle>
          <CardDescription>
            Crie dashboards customizados com métricas de tarefas e projetos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Funcionalidade de painéis será implementada em breve
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboards;