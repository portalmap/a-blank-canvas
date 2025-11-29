import { useState } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { useLists } from "@/hooks/useLists";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ListTreeItem } from "./ListTreeItem";

interface FolderTreeItemProps {
  folder: {
    id: string;
    name: string;
  };
}

export function FolderTreeItem({ folder }: FolderTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: lists } = useLists({ folderId: folder.id });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-sidebar-accent rounded-md text-sm">
        <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        <Folder className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{folder.name}</span>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="ml-4">
        {lists?.map(list => (
          <ListTreeItem key={list.id} list={list} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
