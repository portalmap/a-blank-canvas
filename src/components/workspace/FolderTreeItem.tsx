import { useState } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { useLists } from "@/hooks/useLists";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ListTreeItem } from "./ListTreeItem";
import { NavLink } from "@/components/NavLink";

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
      <div className="flex items-center w-full">
        <CollapsibleTrigger className="p-1.5 hover:bg-sidebar-accent rounded-md">
          <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </CollapsibleTrigger>
        
        <NavLink
          to={`/folder/${folder.id}`}
          className="flex items-center gap-2 flex-1 px-2 py-1.5 hover:bg-sidebar-accent rounded-md text-sm"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
        >
          <Folder className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{folder.name}</span>
        </NavLink>
      </div>
      
      <CollapsibleContent className="ml-4">
        {lists?.map(list => (
          <ListTreeItem key={list.id} list={list} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
