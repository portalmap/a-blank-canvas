import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Rss, Loader2, Maximize2, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedPosts } from '@/hooks/useFeedPosts';
import { CreatePostDialog, type CreatePostDialogValue } from './CreatePostDialog';
import { FeedPostItem } from './FeedPostItem';
import { toast } from 'sonner';

type FilterTab = 'recent' | 'pinned' | 'mine';

export function FeedCard() {
  const { user } = useAuth();
  const {
    posts,
    isLoading,
    canCreatePost,
    isAdmin,
    createPost,
    isCreating,
    updatePost,
    isUpdating,
    togglePin,
    toggleReaction,
    addComment,
    isAddingComment,
    deletePost,
    deleteComment,
  } = useFeedPosts();
  const [isExpanded, setIsExpanded] = useState(false);
  const [tab, setTab] = useState<FilterTab>('recent');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleCreatePost = async (data: CreatePostDialogValue) => {
    try {
      await createPost(data);
      toast.success('Post publicado com sucesso!');
    } catch (error) {
      toast.error('Erro ao publicar o post');
      console.error(error);
    }
  };

  const handleUpdatePost = async (postId: string, data: CreatePostDialogValue) => {
    await updatePost({ id: postId, ...data });
  };

  const handleReact = async (postId: string) => {
    try {
      await toggleReaction(postId);
    } catch (error) {
      toast.error('Erro ao reagir ao post');
      console.error(error);
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    await addComment({ postId, content });
  };

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    await deleteComment({ commentId, postId });
  };

  const handleTogglePin = async (postId: string, isPinned: boolean) => {
    await togglePin({ id: postId, is_pinned: isPinned });
  };

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (tab === 'pinned') list = list.filter((p) => p.is_pinned);
    else if (tab === 'mine') list = list.filter((p) => p.author_id === user?.id);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const haystack = [
          p.title || '',
          p.content || '',
          ...(p.tags || []),
          p.author?.full_name || '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    return list;
  }, [posts, tab, search, user?.id]);

  const EmptyState = () => (
    <div className="text-center py-6 text-muted-foreground">
      <Rss className="h-10 w-10 mx-auto mb-2 opacity-50" />
      <p className="text-sm font-medium">
        {search
          ? 'Nenhum resultado'
          : tab === 'pinned'
          ? 'Nenhuma publicação fixada'
          : tab === 'mine'
          ? 'Você ainda não publicou nada'
          : 'Nenhuma publicação ainda'}
      </p>
      <p className="text-xs">
        {!search && tab === 'recent'
          ? canCreatePost
            ? 'Seja o primeiro a compartilhar algo!'
            : 'Aguarde uma publicação dos administradores.'
          : 'Tente outro filtro ou termo.'}
      </p>
    </div>
  );

  const PostsList = () => (
    <div className="space-y-2 pr-4">
      {filteredPosts.map((post) => (
        <FeedPostItem
          key={post.id}
          post={post}
          isAdmin={isAdmin}
          onReact={handleReact}
          onAddComment={handleAddComment}
          onDeletePost={handleDeletePost}
          onDeleteComment={handleDeleteComment}
          onUpdatePost={handleUpdatePost}
          onTogglePin={handleTogglePin}
          isAddingComment={isAddingComment}
          isUpdating={isUpdating}
        />
      ))}
    </div>
  );

  const Filters = ({ compact = false }: { compact?: boolean }) => (
    <div className="flex items-center gap-2">
      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)} className="flex-1">
        <TabsList className="h-8">
          <TabsTrigger value="recent" className="text-xs h-6 px-2">
            Recentes
          </TabsTrigger>
          <TabsTrigger value="pinned" className="text-xs h-6 px-2">
            Fixados
          </TabsTrigger>
          <TabsTrigger value="mine" className="text-xs h-6 px-2">
            Meus
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {showSearch ? (
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`h-8 pl-7 pr-7 text-xs ${compact ? 'w-32' : 'w-44'}`}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setShowSearch(false);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowSearch(true)}
        >
          <Search className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Rss className="h-4 w-4 text-primary" />
              Feed
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsExpanded(true)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Expandir</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 gap-3 pt-0">
          {canCreatePost && (
            <CreatePostDialog onSubmit={handleCreatePost} isSubmitting={isCreating} />
          )}

          <Filters compact />

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <EmptyState />
            ) : (
              <PostsList />
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5 text-primary" />
              Feed
            </DialogTitle>
          </DialogHeader>

          {canCreatePost && (
            <CreatePostDialog onSubmit={handleCreatePost} isSubmitting={isCreating} />
          )}

          <Filters />

          <ScrollArea className="flex-1 max-h-[65vh]">
            {filteredPosts.length === 0 ? <EmptyState /> : <PostsList />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
