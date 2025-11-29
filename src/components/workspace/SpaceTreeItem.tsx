import { useState } from "react";
import { ChevronRight, Circle } from "lucide-react";
import { useFolders } from "@/hooks/useFolders";
import { useLists } from "@/hooks/useLists";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FolderTreeItem } from "./FolderTreeItem";
import { ListTreeItem } from "./ListTreeItem";
import { NavLink } from "@/components/NavLink";

interface SpaceTreeItemProps {
  space: {
    id: string;
    name: string;
    color: string | null;
  };
  isCollapsed: boolean;
}

export function SpaceTreeItem({ space, isCollapsed }: SpaceTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: folders } = useFolders(space.id);
  const { data: allLists } = useLists({ spaceId: space.id });
  
  // Filter lists that don't belong to any folder (direct lists)
  const directLists = allLists?.filter(list => !list.folder_id);

  if (isCollapsed) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center w-full">
        <CollapsibleTrigger className="p-1.5 hover:bg-sidebar-accent rounded-md">
          <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </CollapsibleTrigger>
        
        <NavLink
          to={`/space/${space.id}`}
          className="flex items-center gap-2 flex-1 px-2 py-1.5 hover:bg-sidebar-accent rounded-md text-sm"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
        >
          <Circle 
            className="h-3 w-3 flex-shrink-0" 
            style={{ color: space.color || 'hsl(var(--sidebar-foreground))' }}
            fill={space.color || 'currentColor'}
          />
          <span className="truncate">{space.name}</span>
        </NavLink>
      </div>
      
      <CollapsibleContent className="ml-4">
        {/* Folders with their lists */}
        {folders?.map(folder => (
          <FolderTreeItem key={folder.id} folder={folder} />
        ))}
        
        {/* Direct lists (without folder) */}
        {directLists?.map(list => (
          <ListTreeItem key={list.id} list={list} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
