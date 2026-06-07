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

// Extrai o path do storage a partir de uma URL pública ou retorna o path se já for relativo
const extractStoragePath = (fileUrl: string, bucket: string): string => {
  if (!fileUrl.startsWith('http')) return fileUrl;
  const marker = `/${bucket}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx !== -1) return fileUrl.substring(idx + marker.length);
  return fileUrl;
};

// Gera signed URL para um path do storage
const getSignedUrl = async (bucket: string, path: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3888000); // 45 dias
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
};

// Resolve URLs para uma lista de attachments
const resolveAttachmentUrls = async (attachments: TaskAttachment[]): Promise<TaskAttachment[]> => {
  if (!attachments.length) return [];
  
  const paths = attachments.map(a => extractStoragePath(a.file_url, 'task-attachments'));
  
  const { data, error } = await supabase.storage
    .from('task-attachments')
    .createSignedUrls(paths, 3888000);
  
  if (error || !data) {
    // Fallback individual
    return Promise.all(attachments.map(async (a) => {
      const path = extractStoragePath(a.file_url, 'task-attachments');
      const url = await getSignedUrl('task-attachments', path);
      return { ...a, file_url: url || a.file_url };
    }));
  }
  
  return attachments.map((a, i) => ({
    ...a,
    file_url: data[i]?.signedUrl || a.file_url,
  }));
};

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
      const attachments = data as TaskAttachment[];
      return resolveAttachmentUrls(attachments);
    },
    enabled: !!taskId,
  });
};

// Sanitiza nome do arquivo removendo acentos e caracteres especiais
const sanitizeFileName = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
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

      const safeName = sanitizeFileName(file.name);
      const storagePath = `${user.id}/${taskId}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Gerar signed URL para retorno imediato
      const signedUrl = await getSignedUrl('task-attachments', storagePath);

      // Armazenar o path no banco (não a URL pública)
      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_url: storagePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, file_url: signedUrl || storagePath, storage_path: storagePath } as TaskAttachment & { storage_path: string };
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
      // Extrair o path - pode ser URL completa (legado) ou path relativo (novo)
      const filePath = extractStoragePath(fileUrl, 'task-attachments');
      if (filePath) {
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
