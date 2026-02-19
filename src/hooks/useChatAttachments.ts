import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatAttachment {
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export const useUploadChatAttachments = () => {
  const { user } = useAuth();

  const uploadFiles = async (files: File[]): Promise<ChatAttachment[]> => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    const results: ChatAttachment[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${timestamp}_${safeName}`;

      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(path);

      results.push({
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
      });
    }

    return results;
  };

  return { uploadFiles };
};
