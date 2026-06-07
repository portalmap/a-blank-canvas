import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, UserPlus } from 'lucide-react';
import { useTeams, useCreateTeam } from '@/hooks/useTeams';
import { useWorkspaces } from '@/hooks/useWorkspaces';

const Teams = () => {
  const { data: workspaces } = useWorkspaces();
  const currentWorkspaceId = workspaces?.[0]?.id || '';
  const { data: teams, isLoading } = useTeams(currentWorkspaceId);
  const createTeam = useCreateTeam(currentWorkspaceId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    await createTeam.mutateAsync({
      name: teamName,
      description: teamDescription,
    });

    setTeamName('');
    setTeamDescription('');
    setDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipes</h1>
          <p className="text-muted-foreground mt-1">
            Organize squads e gerencie membros
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Equipe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Equipe</DialogTitle>
              <DialogDescription>
                Crie uma equipe para organizar membros por departamento ou projeto
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Equipe</Label>
                <Input
                  id="name"
                  placeholder="Equipe de Desenvolvimento"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito da equipe..."
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createTeam.isPending}>
                {createTeam.isPending ? 'Criando...' : 'Criar Equipe'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {teams && teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma equipe criada</p>
            <p className="text-muted-foreground mb-4">Comece criando sua primeira equipe</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Equipe
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams?.map((team) => (
            <Card key={team.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {team.name}
                  </span>
                </CardTitle>
                <CardDescription>
                  {team.description || 'Sem descrição'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {team.team_members?.[0]?.count || 0} membros
                  </span>
                  <Button variant="ghost" size="sm">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Teams;