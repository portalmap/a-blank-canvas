import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface Document {
  id: string;
  workspace_id: string;
  title: string;
  emoji: string | null;
  cover_url: string | null;
  content: Json;
  is_wiki: boolean;
  is_protected: boolean;
  is_archived: boolean;
  is_favorite: boolean;
  parent_document_id: string | null;
  position: number;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  tags?: DocumentTag[];
  creator?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  isFavorited?: boolean;
}

export interface DocumentTag {
  id: string;
  name: string;
  color: string;
}

export type DocumentFilter = 'all' | 'created' | 'shared' | 'private' | 'archived' | 'favorites' | 'wikis';

interface UseDocumentsOptions {
  filter?: DocumentFilter;
  search?: string;
  tagIds?: string[];
}

export const useDocuments = (options: UseDocumentsOptions = {}) => {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { filter = 'all', search, tagIds } = options;

  const documentsQuery = useQuery({
    queryKey: ['documents', activeWorkspace?.id, filter, search, tagIds],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      let query = supabase
        .from('documents')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('updated_at', { ascending: false });

      // Apply filters
      switch (filter) {
        case 'created':
          if (user?.id) query = query.eq('created_by_user_id', user.id);
          break;
        case 'archived':
          query = query.eq('is_archived', true);
          break;
        case 'wikis':
          query = query.eq('is_wiki', true).eq('is_archived', false);
          break;
        case 'all':
        default:
          query = query.eq('is_archived', false);
          break;
      }

      // Apply search
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch tags for each document
      if (data && data.length > 0) {
        const docIds = data.map(d => d.id);
        
        const { data: tagRelations } = await supabase
          .from('document_tag_relations')
          .select(`
            document_id,
            tag:document_tags(id, name, color)
          `)
          .in('document_id', docIds);

        const { data: favorites } = await supabase
          .from('document_favorites')
          .select('document_id')
          .in('document_id', docIds)
          .eq('user_id', user?.id || '');

        const favoriteDocIds = new Set(favorites?.map(f => f.document_id) || []);

        // Map tags to documents
        const docsWithTags: Document[] = data.map(doc => ({
          ...doc,
          creator: null,
          tags: tagRelations
            ?.filter(tr => tr.document_id === doc.id)
            .map(tr => tr.tag as unknown as DocumentTag) || [],
          isFavorited: favoriteDocIds.has(doc.id)
        }));

        // Filter by favorites if needed
        if (filter === 'favorites') {
          return docsWithTags.filter(d => d.isFavorited);
        }

        // Filter by tags if needed
        if (tagIds && tagIds.length > 0) {
          return docsWithTags.filter(doc => 
            doc.tags?.some(tag => tagIds.includes(tag.id))
          );
        }

        return docsWithTags;
      }

      return (data || []).map(d => ({ ...d, creator: null, tags: [], isFavorited: false })) as Document[];
    },
    enabled: !!activeWorkspace?.id,
  });

  const createDocument = useMutation({
    mutationFn: async (data: { title: string; emoji?: string; is_wiki?: boolean }) => {
      if (!activeWorkspace?.id || !user?.id) throw new Error('Missing workspace or user');

      const { data: doc, error } = await supabase
        .from('documents')
        .insert({
          workspace_id: activeWorkspace.id,
          title: data.title,
          emoji: data.emoji,
          is_wiki: data.is_wiki || false,
          created_by_user_id: user.id,
          content: {},
        })
        .select()
        .single();

      if (error) throw error;
      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Documento criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar documento: ' + error.message);
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; emoji?: string; content?: Json; is_wiki?: boolean; is_protected?: boolean; is_archived?: boolean }) => {
      const { error } = await supabase
        .from('documents')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar documento: ' + error.message);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Documento excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir documento: ' + error.message);
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ documentId, isFavorited }: { documentId: string; isFavorited: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');

      if (isFavorited) {
        const { error } = await supabase
          .from('document_favorites')
          .delete()
          .eq('document_id', documentId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('document_favorites')
          .insert({ document_id: documentId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const archiveDocument = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase
        .from('documents')
        .update({ is_archived: archive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(variables.archive ? 'Documento arquivado!' : 'Documento restaurado!');
    },
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error,
    createDocument,
    updateDocument,
    deleteDocument,
    toggleFavorite,
    archiveDocument,
  };
};

export const useDocumentTags = () => {
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ['document-tags', activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('document_tags')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeWorkspace?.id,
  });

  const createTag = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      if (!activeWorkspace?.id) throw new Error('Missing workspace');

      const { data: tag, error } = await supabase
        .from('document_tags')
        .insert({
          workspace_id: activeWorkspace.id,
          name: data.name,
          color: data.color,
        })
        .select()
        .single();

      if (error) throw error;
      return tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-tags'] });
      toast.success('Tag criada!');
    },
  });

  return {
    tags: tagsQuery.data || [],
    isLoading: tagsQuery.isLoading,
    createTag,
  };
};
