import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Plus } from 'lucide-react';

const Automations = () => {
  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automações</h1>
          <p className="text-muted-foreground mt-1">
            Configure regras automáticas para otimizar seu fluxo de trabalho
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Regras de Automação
          </CardTitle>
          <CardDescription>
            Crie automações como auto-assign de tarefas, notificações e mudanças de status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Funcionalidade de automações será implementada em breve
              </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Automations;