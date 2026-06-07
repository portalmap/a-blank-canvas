import { Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTagStats } from '@/hooks/useTagStats';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface TagBreakdownCardProps {
  workspaceId?: string;
}

export function TagBreakdownCard({ workspaceId }: TagBreakdownCardProps) {
  const { activeWorkspace } = useWorkspace();
  const wsId = workspaceId || activeWorkspace?.id;
  
  const { data: tagStats = [], isLoading } = useTagStats(wsId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Etiquetas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tagStats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Etiquetas
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 text-muted-foreground">
          <Tag className="h-8 w-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Nenhuma etiqueta utilizada</p>
        </CardContent>
      </Card>
    );
  }

  const topTags = tagStats.slice(0, 5);
  const maxTasks = Math.max(...topTags.map(t => t.totalTasks));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Etiquetas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topTags.map((tag) => (
          <div key={tag.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color || '#6b7280' }}
                />
                <span className="font-medium truncate">{tag.name}</span>
              </div>
              <span className="text-muted-foreground">
                {tag.completedTasks}/{tag.totalTasks}
              </span>
            </div>
            <Progress
              value={(tag.totalTasks / maxTasks) * 100}
              className="h-2"
              style={{
                ['--progress-background' as string]: tag.color || '#6b7280',
              }}
            />
          </div>
        ))}
        
        {tagStats.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{tagStats.length - 5} etiquetas adicionais
          </p>
        )}
      </CardContent>
    </Card>
  );
}
