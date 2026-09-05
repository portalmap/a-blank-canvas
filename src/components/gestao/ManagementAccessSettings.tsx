import { useMemo, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAddManagementMember,
  useManagementMembers,
  useRemoveManagementMember,
} from '@/hooks/useManagement';

export function ManagementAccessSettings({ canManage }: { canManage: boolean }) {
  const { data, isLoading } = useManagementMembers(true);
  const add = useAddManagementMember();
  const remove = useRemoveManagementMember();
  const [search, setSearch] = useState('');

  const members = data?.members ?? [];
  const memberIds = new Set(members.map((m) => m.userId));

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return (data?.users ?? [])
      .filter((u) => !memberIds.has(u.userId))
      .filter(
        (u) =>
          (u.fullName ?? '').toLowerCase().includes(term) ||
          (u.email ?? '').toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [search, data?.users, members]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quem pode ver os relatórios</CardTitle>
        <CardDescription>
          Administradores globais já têm acesso. Aqui você libera pessoas específicas para ver os
          dados estratégicos deste módulo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="space-y-2">
            <Input
              placeholder="Buscar pessoa por nome ou e-mail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {candidates.map((u) => (
              <div
                key={u.userId}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.fullName ?? 'Sem nome'}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={add.isPending}
                  onClick={() => {
                    add.mutate(u.userId);
                    setSearch('');
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  Liberar
                </Button>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !members.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma pessoa convidada ainda.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.fullName ?? 'Sem nome'}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(m.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
