import { useState } from "react";
import { ChevronRight, Circle, MoreHorizontal, Folder, List, Trash2, Pencil, Link, Move, Copy, Archive, FolderPlus, ListPlus, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFolders, useCreateFolder } from "@/hooks/useFolders";
import { useLists, useCreateList } from "@/hooks/useLists";
import { useSpace, useDeleteSpace, useUpdateSpace } from "@/hooks/useSpaces";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { activeWorkspace } = useWorkspace();
  const { data: currentSpace } = useSpace(space.id);
  const { data: folders } = useFolders(space.id);
  const { data: allLists } = useLists({ spaceId: space.id });
  const { data: userRole } = useUserRole();
  
  const canDelete = userRole?.isAdmin;
  
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newName, setNewName] = useState('');

  const createFolder = useCreateFolder();
  const createList = useCreateList();
  const deleteSpace = useDeleteSpace();
  const updateSpace = useUpdateSpace();
  
  // Filter lists that don't belong to any folder (direct lists)
  const directLists = allLists?.filter(list => !list.folder_id);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    await createFolder.mutateAsync({
      spaceId: space.id,
      name: newFolderName,
      description: newFolderDescription,
    });

    setNewFolderName('');
    setNewFolderDescription('');
    setIsFolderDialogOpen(false);
  };

  const handleCreateList = async () => {
    if (!currentSpace || !newListName.trim()) return;
    
    await createList.mutateAsync({
      workspaceId: currentSpace.workspace_id,
      spaceId: space.id,
      name: newListName,
      description: newListDescription,
    });

    setNewListName('');
    setNewListDescription('');
    setIsListDialogOpen(false);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === space.name) return;
    
    await updateSpace.mutateAsync({
      id: space.id,
      name: newName,
    });
    
    setIsRenameDialogOpen(false);
  };

  if (isCollapsed) return null;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center w-full group">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsFolderDialogOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Nova Pasta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsListDialogOpen(true)}>
                <ListPlus className="mr-2 h-4 w-4" />
                Nova Lista
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/automations?scopeType=space&scopeId=${space.id}`)}>
                <Zap className="mr-2 h-4 w-4" />
                Ver Automações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setNewName(space.name);
                setIsRenameDialogOpen(true);
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Função em desenvolvimento')}>
                <Link className="mr-2 h-4 w-4" />
                Copiar Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Função em desenvolvimento')}>
                <Move className="mr-2 h-4 w-4" />
                Mover
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Função em desenvolvimento')}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Função em desenvolvimento')}>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Space
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Dialog for creating folder */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Pasta</DialogTitle>
            <DialogDescription>
              Adicione uma nova pasta neste space
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nome</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Onboarding, Infraestrutura"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-description">Descrição (opcional)</Label>
              <Textarea
                id="folder-description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Descreva o propósito desta pasta"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              disabled={!newFolderName.trim() || createFolder.isPending}
            >
              Criar Pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for creating list */}
      <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Lista</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <span>{activeWorkspace?.name}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium">{space.name}</span>
              </div>
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

      {/* Dialog for renaming space */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Space</DialogTitle>
            <DialogDescription>
              Digite o novo nome para o space
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-space">Nome</Label>
              <Input
                id="rename-space"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do space"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRename} 
              disabled={!newName.trim() || newName === space.name || updateSpace.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for deleting space */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Space?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as pastas e listas dentro deste space serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteSpace.mutate(space.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
