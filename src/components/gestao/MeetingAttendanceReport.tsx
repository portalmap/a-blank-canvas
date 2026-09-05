import { useMemo, useState } from 'react';
import { ChevronDown, Download, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMeetingAttendance, useRefreshMeetingAttendance } from '@/hooks/useManagement';

function fmtDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

const TYPE_LABEL: Record<string, string> = {
  signed_in: 'Conta Google',
  anonymous: 'Anônimo',
  phone: 'Telefone',
};

export function MeetingAttendanceReport() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useMeetingAttendance(days, true);
  const refresh = useRefreshMeetingAttendance();

  const meetings = data ?? [];

  const totals = useMemo(() => {
    const participants = new Set<string>();
    let seconds = 0;
    for (const meeting of meetings) {
      for (const p of meeting.participants) {
        participants.add(p.key);
        seconds += p.totalSeconds;
      }
    }
    return { meetings: meetings.length, participants: participants.size, seconds };
  }, [meetings]);

  const exportCsv = () => {
    const rows = [
      ['Reunião', 'Código', 'Início', 'Fim', 'Participante', 'Tipo', 'Entrada', 'Saída', 'Retornos', 'Tempo total (min)'],
    ];
    for (const meeting of meetings) {
      for (const p of meeting.participants) {
        rows.push([
          meeting.title,
          meeting.meetCode ?? '',
          fmtDateTime(meeting.startTime),
          fmtDateTime(meeting.endTime),
          p.name,
          TYPE_LABEL[p.type] ?? p.type,
          fmtDateTime(p.firstJoin),
          fmtDateTime(p.lastLeave),
          String(Math.max(0, p.sessions.length - 1)),
          String(Math.round(p.totalSeconds / 60)),
        ]);
      }
    }
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `presenca-reunioes-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => refresh.mutate(2)}
          disabled={refresh.isPending}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refresh.isPending ? 'animate-spin' : ''}`} />
          Atualizar presença
        </Button>
        <Button variant="outline" onClick={exportCsv} disabled={!meetings.length} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Reuniões</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.meetings}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pessoas presentes</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.participants}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tempo somado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fmtDuration(totals.seconds)}</CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !meetings.length ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma reunião com presença registrada neste período. Use “Atualizar presença” após o
            término das reuniões — o Google leva alguns minutos para consolidar os dados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Collapsible key={meeting.id}>
              <Card>
                <CollapsibleTrigger className="w-full text-left">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="truncate text-base">{meeting.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {fmtDateTime(meeting.startTime)} — {fmtTime(meeting.endTime)}
                        {meeting.meetCode ? ` · ${meeting.meetCode}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {meeting.participants.length}
                      </Badge>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                            <th className="py-2 pr-3">Participante</th>
                            <th className="py-2 pr-3">Tipo</th>
                            <th className="py-2 pr-3">1ª entrada</th>
                            <th className="py-2 pr-3">Última saída</th>
                            <th className="py-2 pr-3">Retornos</th>
                            <th className="py-2">Tempo total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meeting.participants.map((p) => (
                            <tr key={p.key} className="border-b last:border-0 align-top">
                              <td className="py-2 pr-3">
                                <div className="font-medium">{p.name}</div>
                                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                  {p.sessions.map((s, i) => (
                                    <div key={i}>
                                      {fmtTime(s.join)} → {fmtTime(s.leave)}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2 pr-3">{TYPE_LABEL[p.type] ?? p.type}</td>
                              <td className="py-2 pr-3">{fmtTime(p.firstJoin)}</td>
                              <td className="py-2 pr-3">{fmtTime(p.lastLeave)}</td>
                              <td className="py-2 pr-3">{Math.max(0, p.sessions.length - 1)}</td>
                              <td className="py-2">{fmtDuration(p.totalSeconds)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {meeting.invitedMissing.length > 0 && (
                      <div className="rounded-md border border-dashed p-3 text-sm">
                        <p className="mb-1 font-medium">Convidados que não apareceram</p>
                        <p className="text-muted-foreground">{meeting.invitedMissing.join(', ')}</p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
