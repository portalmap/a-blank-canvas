import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface DocsHubCardProps {
  icon: LucideIcon;
  title: string;
  count: number;
  color: string;
  onClick?: () => void;
}

export const DocsHubCard = ({ icon: Icon, title, count, color, onClick }: DocsHubCardProps) => {
  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{count}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
