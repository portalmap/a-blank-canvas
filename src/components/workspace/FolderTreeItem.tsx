import { useState } from "react";
import { ChevronRight, Folder, Plus, List } from "lucide-react";
import { useLists, useCreateList } from "@/hooks/useLists";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ListTreeItem } from "./ListTreeItem";
import { NavLink } from "@/components/NavLink";

interface FolderTreeItemProps {
  folder: {
    id: string;
    name: string;
    space_id: string;
  };
}

export function FolderTreeItem({ folder }: FolderTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { activeWorkspace } = useWorkspace();
  const { data: lists } = useLists({ folderId: folder.id });
  
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  const createList = useCreateList();

  const handleCreateList = async () => {
    if (!activeWorkspace || !newListName.trim()) return;
    
    await createList.mutateAsync({
      workspaceId: activeWorkspace.id,
      spaceId: folder.space_id,
      folderId: folder.id,
      name: newListName,
      description: newListDescription,
    });

    setNewListName('');
    setNewListDescription('');
    setIsListDialogOpen(false);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center w-full group">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsListDialogOpen(true)}>
                <List className="mr-2 h-4 w-4" />
                Nova Lista
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <CollapsibleContent className="ml-4">
          {lists?.map(list => (
            <ListTreeItem key={list.id} list={list} />
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Dialog for creating list */}
      <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Lista</DialogTitle>
            <DialogDescription>
              Adicione uma nova lista nesta pasta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Nome</Label>
              <Input
                id="list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ex: Sprint 1, Backlog"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-description">Descrição (opcional)</Label>
              <Textarea
                id="list-description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Descreva o propósito desta lista"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsListDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateList} 
              disabled={!newListName.trim() || createList.isPending}
            >
              Criar Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
