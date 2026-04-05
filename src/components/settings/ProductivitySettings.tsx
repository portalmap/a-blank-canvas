import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, CircleDot, Save, ShieldCheck, Settings2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpaces } from '@/hooks/useSpaces';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import {
  useProductivitySettings,
  useUpsertProductivitySettings,
  useProductivityValidators,
  useAddProductivityValidator,
  useRemoveAllValidatorEntries,
} from '@/hooks/useProductivitySettings';

export function ProductivitySettings() {
  const { activeWorkspace } = useWorkspace();
  const { data: settings, isLoading: loadingSettings } = useProductivitySettings();
  const { data: validators = [], isLoading: loadingValidators } = useProductivityValidators();
  const { data: spaces = [] } = useSpaces(activeWorkspace?.id);
  const { data: members = [] } = useWorkspaceMembers(activeWorkspace?.id);
  const upsertSettings = useUpsertProductivitySettings();
  const addValidator = useAddProductivityValidator();
  const removeValidator = useRemoveAllValidatorEntries();

  const [earlyPercent, setEarlyPercent] = useState(50);
  const [onTimePercent, setOnTimePercent] = useState(100);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [allSpaces, setAllSpaces] = useState(false);

  useEffect(() => {
    if (settings) {
      setEarlyPercent(Number(settings.early_threshold_percent));
      setOnTimePercent(Number(settings.on_time_threshold_percent));
    }
  }, [settings]);

  const handleSaveRules = () => {
    upsertSettings.mutate({
      early_threshold_percent: earlyPercent,
      on_time_threshold_percent: onTimePercent,
    });
  };

  const handleAddValidator = () => {
    if (!selectedUserId) return;
    const spaceIds = allSpaces ? [null] : selectedSpaceIds;
    if (spaceIds.length === 0) return;

    addValidator.mutate(
      { user_id: selectedUserId, space_ids: spaceIds },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          setSelectedUserId('');
          setSelectedSpaceIds([]);
          setAllSpaces(false);
        },
      }
    );
  };

  // Group validators by user
  const validatorsByUser = useMemo(() => {
    const map = new Map<string, typeof validators>();
    for (const v of validators) {
      const list = map.get(v.user_id) || [];
      list.push(v);
      map.set(v.user_id, list);
    }
    return map;
  }, [validators]);

  const getSpaceName = (spaceId: string | null) => {
    if (!spaceId) return 'Todos os Spaces';
    return spaces.find(s => s.id === spaceId)?.name || 'Space desconhecido';
  };

  const getMember = (userId: string) => members.find(m => m.user_id === userId);

  if (!activeWorkspace) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Selecione um workspace para configurar produtividade.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Regras de Classificação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Regras de Classificação
          </CardTitle>
          <CardDescription>
            Define como as tarefas são classificadas com base na porcentagem do prazo entre data de início e data de entrega.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual indicators */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-500/10 border-green-500/30">
              <CircleDot className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium text-foreground">Antecipada</p>
                <p className="text-sm text-muted-foreground">Até {earlyPercent}% do prazo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-blue-500/10 border-blue-500/30">
              <CircleDot className="h-6 w-6 text-blue-500" />
              <div>
                <p className="font-medium text-foreground">Em dia</p>
                <p className="text-sm text-muted-foreground">{earlyPercent > 0 ? `${earlyPercent},01%` : '0%'} até {onTimePercent}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-500/10 border-red-500/30">
              <CircleDot className="h-6 w-6 text-red-500" />
              <div>
                <p className="font-medium text-foreground">Atrasada</p>
                <p className="text-sm text-muted-foreground">Acima de {onTimePercent}%</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Fórmula de Produtividade */}
          <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
            <p className="text-sm font-medium">📐 Fórmula de Produtividade (0% a 200%)</p>
            <p className="text-sm text-muted-foreground">
              <strong>Produtividade = 200% - % do prazo utilizado</strong>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-green-500/10 text-center">
                <p className="font-medium text-green-600">0% entrega</p>
                <p className="text-muted-foreground">200% produtividade</p>
              </div>
              <div className="p-2 rounded bg-green-500/10 text-center">
                <p className="font-medium text-green-600">50% entrega</p>
                <p className="text-muted-foreground">150% produtividade</p>
              </div>
              <div className="p-2 rounded bg-blue-500/10 text-center">
                <p className="font-medium text-blue-600">100% entrega</p>
                <p className="text-muted-foreground">100% produtividade</p>
              </div>
              <div className="p-2 rounded bg-red-500/10 text-center">
                <p className="font-medium text-red-600">200%+ entrega</p>
                <p className="text-muted-foreground">0% produtividade</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O score geral é a <strong>média</strong> dos scores individuais de cada tarefa concluída.
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <strong>Classificação visual:</strong> As cores (verde, azul, vermelha) são definidas pelos limites abaixo. O score de produtividade é calculado automaticamente pela fórmula acima.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Limite de "Antecipada" (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={earlyPercent}
                  onChange={(e) => setEarlyPercent(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Entregue em até {earlyPercent}% do prazo = antecipada
                </p>
              </div>
              <div className="space-y-2">
                <Label>Limite de "Em dia" (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={onTimePercent}
                  onChange={(e) => setOnTimePercent(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Entregue entre {earlyPercent},01% e {onTimePercent}% = em dia
                </p>
              </div>
            </div>

            <Button onClick={handleSaveRules} disabled={upsertSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Regras
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validadores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Validadores por Space
              </CardTitle>
              <CardDescription>
                Usuários que podem aprovar ou ajustar a classificação de produtividade das tarefas.
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Validador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Validador</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Usuário</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map(member => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.profile?.full_name || 'Sem nome'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Spaces</Label>
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        id="all-spaces"
                        checked={allSpaces}
                        onCheckedChange={(checked) => {
                          setAllSpaces(!!checked);
                          if (checked) setSelectedSpaceIds([]);
                        }}
                      />
                      <label htmlFor="all-spaces" className="text-sm font-medium">
                        Todos os Spaces
                      </label>
                    </div>
                    {!allSpaces && (
                      <ScrollArea className="h-48 border rounded-md p-2">
                        {spaces.map(space => (
                          <div key={space.id} className="flex items-center gap-2 py-1.5">
                            <Checkbox
                              id={`space-${space.id}`}
                              checked={selectedSpaceIds.includes(space.id)}
                              onCheckedChange={(checked) => {
                                setSelectedSpaceIds(prev =>
                                  checked
                                    ? [...prev, space.id]
                                    : prev.filter(id => id !== space.id)
                                );
                              }}
                            />
                            <label htmlFor={`space-${space.id}`} className="text-sm">
                              {space.name}
                            </label>
                          </div>
                        ))}
                      </ScrollArea>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleAddValidator}
                    disabled={!selectedUserId || (!allSpaces && selectedSpaceIds.length === 0) || addValidator.isPending}
                  >
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingValidators ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : validatorsByUser.size === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum validador configurado.</p>
          ) : (
            <div className="space-y-3">
              {Array.from(validatorsByUser.entries()).map(([userId, entries]) => {
                const member = getMember(userId);
                const hasAllSpaces = entries.some(e => e.space_id === null);

                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member?.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(member?.profile?.full_name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member?.profile?.full_name || 'Usuário sem nome'}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {hasAllSpaces ? (
                            <Badge variant="secondary" className="text-xs">
                              Todos os Spaces
                            </Badge>
                          ) : (
                            entries.map(entry => (
                              <Badge key={entry.id} variant="outline" className="text-xs">
                                {getSpaceName(entry.space_id)}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeValidator.mutate(userId)}
                      disabled={removeValidator.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
