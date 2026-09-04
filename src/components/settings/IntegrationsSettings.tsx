import { useState } from 'react';
import { Calendar, ChevronRight, Circle, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUserRole } from '@/hooks/useUserRole';
import { useGoogleCalendarAccounts, useDisconnectGoogleAccount } from '@/hooks/useGoogleCalendar';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function IntegrationsSettings() {
  const { isGlobalOwner, isOwner } = useUserRole();
  const allowed = isGlobalOwner || isOwner;
  const [googleOpen, setGoogleOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ id: string; label: string } | null>(null);

  const { data: accounts, isLoading } = useGoogleCalendarAccounts(allowed && googleOpen);
  const disconnect = useDisconnectGoogleAccount();

  if (!allowed) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          <ShieldAlert className="h-5 w-5" />
          Apenas proprietários do sistema podem gerenciar as integrações.
        </CardContent>
      </Card>
    );
  }

  const online = (accounts ?? []).filter((a) => a.status === 'online').length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Integrações</h2>
        <p className="text-sm text-muted-foreground">
          Ferramentas conectadas ao MAP Flow e o status de cada conta.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer transition-colors hover:border-primary/40"
          onClick={() => setGoogleOpen(true)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">Google Agenda</CardTitle>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>Espelhamento de compromissos por usuário</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Clique para ver as contas conectadas
          </CardContent>
        </Card>
      </div>

      <Dialog open={googleOpen} onOpenChange={setGoogleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Google Agenda</DialogTitle>
            <DialogDescription>
              {isLoading
                ? 'Carregando contas...'
                : `${accounts?.length ?? 0} conta(s) conectada(s) · ${online} online`}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {(accounts ?? []).length === 0 && !isLoading && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum usuário conectou a conta Google ainda.
              </p>
            )}

            {(accounts ?? []).map((account) => (
              <div
                key={account.userId}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={account.avatarUrl ?? undefined} />
                    <AvatarFallback>{(account.fullName ?? '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{account.fullName ?? 'Sem nome'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {account.googleEmail ?? 'e-mail não identificado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={account.status === 'online' ? 'default' : 'secondary'} className="gap-1">
                    <Circle
                      className={`h-2 w-2 ${account.status === 'online' ? 'fill-current' : 'fill-muted-foreground'}`}
                    />
                    {account.status === 'online' ? 'Online' : 'Offline'}
                  </Badge>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {formatDate(account.lastSyncedAt)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPendingUser({
                        id: account.userId,
                        label: account.googleEmail ?? account.fullName ?? 'este usuário',
                      })
                    }
                  >
                    Desconectar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingUser} onOpenChange={(open) => !open && setPendingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar conta Google?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta {pendingUser?.label} deixará de sincronizar com o Google. Os compromissos já
              criados no MAP Flow continuam disponíveis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingUser) disconnect.mutate(pendingUser.id);
                setPendingUser(null);
              }}
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
