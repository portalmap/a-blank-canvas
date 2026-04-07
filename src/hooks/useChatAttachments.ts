import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatAttachment {
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

// Extrai o path do storage a partir de uma URL pública ou retorna o path se já for relativo
const extractStoragePath = (fileUrl: string, bucket: string): string => {
  if (!fileUrl.startsWith('http')) return fileUrl;
  const marker = `/${bucket}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx !== -1) return fileUrl.substring(idx + marker.length);
  return fileUrl;
};

// Gera signed URL para um attachment de chat
export const getChatAttachmentSignedUrl = async (fileUrl: string): Promise<string> => {
  const path = extractStoragePath(fileUrl, 'chat-attachments');
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return fileUrl;
  return data.signedUrl;
};

// Resolve URLs para uma lista de attachments de chat
export const resolveChatAttachmentUrls = async (attachments: ChatAttachment[]): Promise<ChatAttachment[]> => {
  if (!attachments || !attachments.length) return [];
  
  const paths = attachments.map(a => extractStoragePath(a.file_url, 'chat-attachments'));
  
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrls(paths, 3600);
  
  if (error || !data) {
    // Fallback: retornar como está
    return attachments;
  }
  
  return attachments.map((a, i) => ({
    ...a,
    file_url: data[i]?.signedUrl || a.file_url,
  }));
};

export const useUploadChatAttachments = () => {
  const { user } = useAuth();

  const uploadFiles = async (files: File[]): Promise<ChatAttachment[]> => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    const results: ChatAttachment[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${timestamp}_${safeName}`;

      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(storagePath, file);

      if (error) throw error;

      // Gerar signed URL
      const { data: signedData } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(storagePath, 3600);

      results.push({
        file_name: file.name,
        file_url: storagePath, // Armazena path no JSONB
        file_type: file.type,
        file_size: file.size,
      });
    }

    return results;
  };

  return { uploadFiles };
};
