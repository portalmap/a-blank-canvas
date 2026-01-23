import { useState } from 'react';
import { MoreHorizontal, Trash2, Move, Maximize2, Pencil, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotesCardProps {
  title: string;
  content: string;
  onUpdateContent: (content: string) => void;
  onDelete: () => void;
  onEdit: () => void;
  onExpand?: () => void;
}

export const NotesCard = ({
  title,
  content,
  onUpdateContent,
  onDelete,
  onEdit,
  onExpand,
}: NotesCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleSave = () => {
    onUpdateContent(editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Move className="mr-2 h-4 w-4" />
                    Redimensionar
                  </DropdownMenuItem>
                  {onExpand && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExpand(); }}>
                      <Maximize2 className="mr-2 h-4 w-4" />
                      Expandir
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Escreva suas notas aqui..."
            className="h-full min-h-[120px] resize-none"
            autoFocus
          />
        ) : (
          <div className="h-full">
            {content ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Clique no lápis para adicionar notas...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
