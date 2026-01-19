import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

export const useTaskAttachments = (taskId?: string) => {
  return useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TaskAttachment[];
    },
    enabled: !!taskId,
  });
};

// Sanitiza nome do arquivo removendo acentos e caracteres especiais
const sanitizeFileName = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Substitui caracteres especiais por "_"
    .replace(/_+/g, '_'); // Remove underscores duplicados
};

export const useUploadAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      file,
    }: {
      taskId: string;
      file: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Gerar caminho único para o arquivo com nome sanitizado
      const safeName = sanitizeFileName(file.name);
      const fileName = `${user.id}/${taskId}/${Date.now()}_${safeName}`;

      // Upload para o storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      // Inserir registro na tabela
      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TaskAttachment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', data.task_id] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.task_id] });
    },
  });
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      taskId,
      fileUrl,
    }: {
      attachmentId: string;
      taskId: string;
      fileUrl: string;
    }) => {
      // Extrair o path do arquivo da URL
      const urlParts = fileUrl.split('/task-attachments/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('task-attachments').remove([filePath]);
      }

      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', data.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.taskId] });
    },
  });
};

// Helpers para tipo de arquivo
export const getFileCategory = (fileType: string | null): 'image' | 'video' | 'audio' | 'document' | 'other' => {
  if (!fileType) return 'other';
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  if (
    fileType.includes('pdf') ||
    fileType.includes('document') ||
    fileType.includes('sheet') ||
    fileType.includes('presentation') ||
    fileType.includes('text/')
  ) return 'document';
  return 'other';
};

export const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
