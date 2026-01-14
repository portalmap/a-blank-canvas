import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Rss, Loader2, Maximize2 } from 'lucide-react';
import { useFeedPosts } from '@/hooks/useFeedPosts';
import { CreatePostDialog } from './CreatePostDialog';
import { FeedPostItem } from './FeedPostItem';
import { toast } from 'sonner';

export function FeedCard() {
  const { 
    posts, 
    isLoading, 
    createPost, 
    isCreating, 
    toggleReaction,
  } = useFeedPosts();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCreatePost = async (data: { title?: string; content: string }) => {
    try {
      await createPost(data);
      toast.success('Post publicado com sucesso!');
    } catch (error) {
      toast.error('Erro ao publicar o post');
      console.error(error);
    }
  };

  const handleReact = async (postId: string) => {
    try {
      await toggleReaction(postId);
    } catch (error) {
      toast.error('Erro ao reagir ao post');
      console.error(error);
    }
  };

  const handleComment = (postId: string) => {
    toast.info('Funcionalidade de comentários em breve');
  };

  const EmptyState = () => (
    <div className="text-center py-6 text-muted-foreground">
      <Rss className="h-10 w-10 mx-auto mb-2 opacity-50" />
      <p className="text-sm font-medium">Nenhuma publicação ainda</p>
      <p className="text-xs">Seja o primeiro a compartilhar algo!</p>
    </div>
  );

  const PostsList = () => (
    <div className="space-y-2 pr-4">
      {posts.map((post) => (
        <FeedPostItem
          key={post.id}
          post={post}
          onReact={handleReact}
          onComment={handleComment}
        />
      ))}
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
          <CreatePostDialog 
            onSubmit={handleCreatePost} 
            isSubmitting={isCreating} 
          />
          
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : posts.length === 0 ? (
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
          
          <CreatePostDialog 
            onSubmit={handleCreatePost} 
            isSubmitting={isCreating} 
          />
          
          <ScrollArea className="flex-1 max-h-[65vh]">
            {posts.length === 0 ? <EmptyState /> : <PostsList />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
