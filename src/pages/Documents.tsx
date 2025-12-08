import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Star, BookOpen, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocsHubSidebar } from '@/components/documents/DocsHub/DocsHubSidebar';
import { DocsHubTable } from '@/components/documents/DocsHub/DocsHubTable';
import { DocsHubFilters } from '@/components/documents/DocsHub/DocsHubFilters';
import { DocsHubCard } from '@/components/documents/DocsHub/DocsHubCard';
import { CreateDocDialog } from '@/components/documents/DocsHub/CreateDocDialog';
import { useDocuments, useDocumentTags, DocumentFilter, Document } from '@/hooks/useDocuments';
import { Skeleton } from '@/components/ui/skeleton';
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

const Documents = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DocumentFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { 
    documents, 
    isLoading, 
    createDocument, 
    toggleFavorite, 
    archiveDocument,
    deleteDocument 
  } = useDocuments({ filter, search, tagIds: selectedTagIds });
  
  const { tags } = useDocumentTags();

  // Stats
  const stats = useMemo(() => {
    const allDocs = documents.filter(d => !d.is_archived);
    return {
      total: allDocs.length,
      favorites: allDocs.filter(d => d.isFavorited).length,
      wikis: allDocs.filter(d => d.is_wiki).length,
      recent: allDocs.slice(0, 5),
    };
  }, [documents]);

  const handleCreateDocument = async (data: { title: string; emoji?: string; is_wiki?: boolean }) => {
    await createDocument.mutateAsync(data);
    setCreateDialogOpen(false);
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
      {/* Sidebar */}
      <DocsHubSidebar
        currentFilter={filter}
        onFilterChange={setFilter}
        recentDocs={stats.recent}
        onOpenDoc={handleOpenDoc}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documentos</h1>
            <p className="text-muted-foreground mt-1">
              Crie e compartilhe documentação, playbooks e guias
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Documento
          </Button>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <DocsHubCard
            icon={FileText}
            title="Total de Docs"
            count={stats.total}
            color="#3b82f6"
            onClick={() => setFilter('all')}
          />
          <DocsHubCard
            icon={Clock}
            title="Recentes"
            count={stats.recent.length}
            color="#10b981"
            onClick={() => setFilter('all')}
          />
          <DocsHubCard
            icon={Star}
            title="Favoritos"
            count={stats.favorites}
            color="#f59e0b"
            onClick={() => setFilter('favorites')}
          />
          <DocsHubCard
            icon={BookOpen}
            title="Wikis"
            count={stats.wikis}
            color="#8b5cf6"
            onClick={() => setFilter('wikis')}
          />
        </div>

        {/* Filters */}
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

        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as DocumentFilter)} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="created">Criados por mim</TabsTrigger>
            <TabsTrigger value="favorites">Favoritos</TabsTrigger>
            <TabsTrigger value="wikis">Wikis</TabsTrigger>
            <TabsTrigger value="archived">Arquivados</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Documents Table */}
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

      {/* Create Document Dialog */}
      <CreateDocDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateDocument}
        isLoading={createDocument.isPending}
      />

      {/* Delete Confirmation Dialog */}
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
    </div>
  );
};

export default Documents;
