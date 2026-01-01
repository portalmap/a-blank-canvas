import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users } from 'lucide-react';

const Chat = () => {
  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Chat</h1>
        <p className="text-muted-foreground mt-1">
          Comunique-se com sua equipe
        </p>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Canais
          </TabsTrigger>
          <TabsTrigger value="direct" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Mensagens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Canais</CardTitle>
              <CardDescription>
                Organize conversas por tópico, projeto ou departamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Funcionalidade de canais será implementada em breve
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="direct" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Diretas</CardTitle>
              <CardDescription>
                Conversas privadas com membros da equipe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Funcionalidade de mensagens diretas será implementada em breve
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Chat;