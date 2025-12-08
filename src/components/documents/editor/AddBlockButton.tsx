import { Editor } from '@tiptap/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AddBlockButtonProps {
  editor: Editor;
}

export const AddBlockButton = ({ editor }: AddBlockButtonProps) => {
  const handleAddBlock = () => {
    // Move to end of document and add a new paragraph
    editor.chain()
      .focus('end')
      .createParagraphNear()
      .run();
    
    // Insert "/" to trigger slash command menu
    setTimeout(() => {
      editor.chain()
        .focus()
        .insertContent('/')
        .run();
    }, 10);
  };

  return (
    <div className="flex justify-start mt-4 pl-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddBlock}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Adicionar novo bloco</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
