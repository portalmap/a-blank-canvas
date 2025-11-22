import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder } from 'lucide-react';

const Spaces = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Spaces</h1>
        <p className="text-muted-foreground mt-1">
          Visualize todos os spaces dos seus workspaces
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Em Desenvolvimento
          </CardTitle>
          <CardDescription>
            Esta página será implementada em breve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A visualização completa de spaces estará disponível na próxima versão.
            Por enquanto, você pode acessar spaces através do workspace individual.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Spaces;