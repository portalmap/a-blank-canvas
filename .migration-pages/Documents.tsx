import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Star, BookOpen, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocsHubSidebar } from '@/components/documents/DocsHub/DocsHubSidebar';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ImperativePanelHandle } from 'react-resizable-panels';
import { DocsHubTable } from '@/components/documents/DocsHub/DocsHubTable';
import { DocsHubFilters } from '@/components/documents/DocsHub/DocsHubFilters';
import { DocsHubCard } from '@/components/documents/DocsHub/DocsHubCard';
import { CreateDocDialog } from '@/components/documents/DocsHub/CreateDocDialog';
import { MoveDocumentDialog } from '@/components/documents/DocsHub/MoveDocumentDialog';
import { useDocuments, useDocumentTags, useDocumentFolders, DocumentFilter, Document, DocumentFolder } from '@/hooks/useDocuments';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const Documents = () => {
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DocumentFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [createDocFolderId, setCreateDocFolderId] = useState<string | null>(null);
  const [createDocIsWiki, setCreateDocIsWiki] = useState(false);
  const [createFolderIsWiki, setCreateFolderIsWiki] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<DocumentFolder | null>(null);
  const [renameFolder, setRenameFolder] = useState<DocumentFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moveDoc, setMoveDoc] = useState<Document | null>(null);

  const { 
    documents, 
    isLoading, 
    createDocument, 
    toggleFavorite, 
    archiveDocument,
    deleteDocument,
    moveDocument,
  } = useDocuments({ filter, search, tagIds: selectedTagIds });

  const { documents: allDocuments } = useDocuments({});
  
  const { tags } = useDocumentTags();
  const { folders, createFolder, updateFolder, deleteFolder: deleteFolderMutation } = useDocumentFolders();

  const stats = useMemo(() => {
    const allDocs = allDocuments.filter(d => !d.is_archived);
    return {
      total: allDocs.length,
      favorites: allDocs.filter(d => d.isFavorited).length,
      wikis: allDocs.filter(d => d.is_wiki).length,
      recent: allDocs.slice(0, 5),
    };
  }, [allDocuments]);

  const handleCreateDocument = async (data: { title: string; emoji?: string; is_wiki?: boolean; folder_id?: string }) => {
    await createDocument.mutateAsync({
      ...data,
      is_wiki: data.is_wiki || createDocIsWiki,
    });
    setCreateDialogOpen(false);
    setCreateDocFolderId(null);
    setCreateDocIsWiki(false);
  };

  const handleOpenDoc = (doc: Document) => {
    navigate(`/documents/${doc.id}`);
  };

  const handleToggleFavorite = (doc: Document) => {
    toggleFavorite.mutate({ documentId: doc.id, isFavorited: doc.isFavorited || false });
  };

  const handleArchive = (doc: Document) => {
    archiveDocument.mutate({ id: doc.id, archive: !doc.is_archived });
  };

  const handleDelete = () => {
    if (deleteDoc) {
      deleteDocument.mutate(deleteDoc.id);
      setDeleteDoc(null);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync({ name: newFolderName, is_wiki: createFolderIsWiki });
    setNewFolderName('');
    setCreateFolderDialogOpen(false);
    setCreateFolderIsWiki(false);
  };

  const handleRenameFolder = async () => {
    if (!renameFolder || !renameFolderName.trim()) return;
    await updateFolder.mutateAsync({ id: renameFolder.id, name: renameFolderName });
    setRenameFolder(null);
    setRenameFolderName('');
  };

  const handleDeleteFolder = () => {
    if (deleteFolder) {
      deleteFolderMutation.mutate(deleteFolder.id);
      setDeleteFolder(null);
    }
  };

  const handleCreateDocInFolder = (folderId: string) => {
    setCreateDocFolderId(folderId);
    const folder = folders.find(f => f.id === folderId);
    setCreateDocIsWiki(folder?.is_wiki || false);
    setCreateDialogOpen(true);
  };

  const handleMoveDoc = (docId: string, folderId: string | null, isWiki: boolean) => {
    moveDocument.mutate({ id: docId, folder_id: folderId, is_wiki: isWiki });
    setMoveDoc(null);
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedTagIds([]);
  };

  return (
    <div className="flex-1 flex h-full">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          ref={sidebarPanelRef}
          defaultSize={20}
          minSize={sidebarCollapsed ? 3 : 10}
          maxSize={sidebarCollapsed ? 5 : 40}
          collapsible
          collapsedSize={3}
          onCollapse={() => setSidebarCollapsed(true)}
          onExpand={() => setSidebarCollapsed(false)}
        >
          <DocsHubSidebar
            currentFilter={filter}
            onFilterChange={setFilter}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => {
              const panel = sidebarPanelRef.current;
              if (panel) {
                if (sidebarCollapsed) {
                  panel.expand();
                  panel.resize(20);
                } else {
                  panel.collapse();
                }
              }
            }}
            documents={allDocuments}
            folders={folders}
            onOpenDoc={handleOpenDoc}
            onToggleFavorite={handleToggleFavorite}
            onArchiveDoc={handleArchive}
            onDeleteDoc={setDeleteDoc}
            onMoveDoc={setMoveDoc}
            onCreateDoc={() => {
              setCreateDocFolderId(null);
              setCreateDocIsWiki(false);
              setCreateDialogOpen(true);
            }}
            onCreateDocInFolder={handleCreateDocInFolder}
            onCreateFolder={() => {
              setCreateFolderIsWiki(false);
              setCreateFolderDialogOpen(true);
            }}
            onCreateWikiFolder={() => {
              setCreateFolderIsWiki(true);
              setCreateFolderDialogOpen(true);
            }}
            onCreateWikiDoc={() => {
              setCreateDocFolderId(null);
              setCreateDocIsWiki(true);
              setCreateDialogOpen(true);
            }}
            onRenameFolder={(folder) => {
              setRenameFolder(folder);
              setRenameFolderName(folder.name);
            }}
            onDeleteFolder={setDeleteFolder}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={80}>
          <div className="h-full p-6 overflow-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Documentos</h1>
                <p className="text-muted-foreground mt-1">
                  Crie e compartilhe documentação, playbooks e guias
                </p>
              </div>
              <Button onClick={() => { setCreateDocFolderId(null); setCreateDocIsWiki(false); setCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Documento
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <DocsHubCard icon={FileText} title="Total de Docs" count={stats.total} color="#3b82f6" onClick={() => setFilter('all')} />
              <DocsHubCard icon={Clock} title="Recentes" count={stats.recent.length} color="#10b981" onClick={() => setFilter('all')} />
              <DocsHubCard icon={Star} title="Favoritos" count={stats.favorites} color="#f59e0b" onClick={() => setFilter('favorites')} />
              <DocsHubCard icon={BookOpen} title="Wikis" count={stats.wikis} color="#8b5cf6" onClick={() => setFilter('wikis')} />
            </div>

            <div className="mb-4">
              <DocsHubFilters
                search={search}
                onSearchChange={setSearch}
                tags={tags}
                selectedTagIds={selectedTagIds}
                onTagToggle={handleTagToggle}
                onClearFilters={handleClearFilters}
              />
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as DocumentFilter)} className="mb-4">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="created">Criados por mim</TabsTrigger>
                <TabsTrigger value="favorites">Favoritos</TabsTrigger>
                <TabsTrigger value="wikis">Wikis</TabsTrigger>
                <TabsTrigger value="archived">Arquivados</TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <DocsHubTable
                documents={documents}
                onOpen={handleOpenDoc}
                onToggleFavorite={handleToggleFavorite}
                onArchive={handleArchive}
                onDelete={setDeleteDoc}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <CreateDocDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) { setCreateDocFolderId(null); setCreateDocIsWiki(false); }
        }}
        onSubmit={handleCreateDocument}
        isLoading={createDocument.isPending}
        folderId={createDocFolderId}
      />

      <MoveDocumentDialog
        open={!!moveDoc}
        onOpenChange={() => setMoveDoc(null)}
        document={moveDoc}
        folders={folders}
        onMove={handleMoveDoc}
        isLoading={moveDocument.isPending}
      />

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{createFolderIsWiki ? 'Nova Pasta Wiki' : 'Nova Pasta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nome</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nome da pasta..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolder.isPending}>
              {createFolder.isPending ? 'Criando...' : 'Criar Pasta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={!!renameFolder} onOpenChange={() => setRenameFolder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rename-folder">Nome</Label>
              <Input
                id="rename-folder"
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                placeholder="Nome da pasta..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolder(null)}>Cancelar</Button>
            <Button onClick={handleRenameFolder} disabled={!renameFolderName.trim() || updateFolder.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteDoc?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteFolder} onOpenChange={() => setDeleteFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a pasta "{deleteFolder?.name}"? Os documentos dentro não serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Documents;
