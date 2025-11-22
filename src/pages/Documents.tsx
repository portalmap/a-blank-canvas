import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

const Documents = () => {
  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Crie e compartilhe documentação, playbooks e guias
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Biblioteca de Documentos
          </CardTitle>
          <CardDescription>
            Centralize conhecimento e processos da sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Funcionalidade de documentos será implementada em breve
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Documents;