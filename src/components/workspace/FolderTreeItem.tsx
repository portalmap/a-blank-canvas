import { useState } from "react";
import { ChevronRight, Folder, MoreHorizontal, List, Trash2, Pencil, Link, Move, Copy, Archive, ListPlus, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLists, useCreateList } from "@/hooks/useLists";
import { useDeleteFolder, useUpdateFolder } from "@/hooks/useFolders";
import { useDuplicateFolder } from "@/hooks/useDuplicate";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { MoveFolderDialog } from "./MoveFolderDialog";
import { DuplicateDialog } from "./DuplicateDialog";
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
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { activeWorkspace } = useWorkspace();
  const { data: lists } = useLists({ folderId: folder.id });
  
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newName, setNewName] = useState('');

  const createList = useCreateList();
  const deleteFolder = useDeleteFolder();
  const updateFolder = useUpdateFolder();
  const duplicateFolder = useDuplicateFolder();

  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

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

  const handleRename = async () => {
    if (!newName.trim() || newName === folder.name) return;
    
    await updateFolder.mutateAsync({
      id: folder.id,
      name: newName,
    });
    
    setIsRenameDialogOpen(false);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center w-full group min-w-0">
          <CollapsibleTrigger className="p-1.5 hover:bg-sidebar-accent rounded-md flex-shrink-0">
            <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </CollapsibleTrigger>
          
          <NavLink
            to={`/folder/${folder.id}`}
            className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden px-2 py-1.5 hover:bg-sidebar-accent rounded-md text-sm"
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
                className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsListDialogOpen(true)}>
                <ListPlus className="mr-2 h-4 w-4" />
                Nova Lista
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/automations?scopeType=folder&scopeId=${folder.id}`)}>
                <Zap className="mr-2 h-4 w-4" />
                Ver Automações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setNewName(folder.name);
                setIsRenameDialogOpen(true);
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Função em desenvolvimento')}>
                <Link className="mr-2 h-4 w-4" />
                Copiar Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsMoveDialogOpen(true)}>
                <Move className="mr-2 h-4 w-4" />
                Mover
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDuplicateDialogOpen(true)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Função em desenvolvimento')}>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Pasta
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

      {/* Dialog for renaming folder */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
            <DialogDescription>
              Digite o novo nome para a pasta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-folder">Nome</Label>
              <Input
                id="rename-folder"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da pasta"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRename} 
              disabled={!newName.trim() || newName === folder.name || updateFolder.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for deleting folder */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as listas dentro desta pasta serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteFolder.mutate(folder.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for moving folder */}
      {activeWorkspace && (
        <MoveFolderDialog
          open={isMoveDialogOpen}
          onOpenChange={setIsMoveDialogOpen}
          folder={folder}
          workspaceId={activeWorkspace.id}
        />
      )}

      {/* Dialog for duplicating folder */}
      {activeWorkspace && (
        <DuplicateDialog
          open={isDuplicateDialogOpen}
          onOpenChange={setIsDuplicateDialogOpen}
          type="folder"
          itemName={folder.name}
          workspaceId={activeWorkspace.id}
          currentSpaceId={folder.space_id}
          onDuplicate={async (targetSpaceIds) => {
            await duplicateFolder.mutateAsync({
              folderId: folder.id,
              targetSpaceIds,
            });
          }}
          isPending={duplicateFolder.isPending}
        />
      )}
    </>
  );
}
