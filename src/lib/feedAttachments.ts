import { supabase } from '@/integrations/supabase/client';

export type FeedAttachment =
  | {
      kind: 'image';
      storage_path: string;
      name: string;
      mime: string;
      size: number;
    }
  | {
      kind: 'file';
      storage_path: string;
      name: string;
      mime: string;
      size: number;
    }
  | {
      kind: 'doc_link';
      document_id: string;
      title: string;
    };

const BUCKET = 'feed-attachments';
const SIGNED_URL_EXPIRES = 60 * 60 * 24 * 15; // 15 days

export async function uploadFeedAttachment(
  workspaceId: string,
  file: File
): Promise<{ storage_path: string; name: string; mime: string; size: number }> {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${workspaceId}/${crypto.randomUUID()}/${safeName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return {
    storage_path: path,
    name: file.name,
    mime: file.type,
    size: file.size,
  };
}

const urlCache = new Map<string, { url: string; exp: number }>();

export async function getFeedAttachmentUrl(path: string): Promise<string> {
  const cached = urlCache.get(path);
  const now = Date.now();
  if (cached && cached.exp > now + 60_000) return cached.url;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES);
  if (error || !data) throw error || new Error('Failed to sign URL');

  urlCache.set(path, {
    url: data.signedUrl,
    exp: now + SIGNED_URL_EXPIRES * 1000,
  });
  return data.signedUrl;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatCount(n: number): string {
  if (!n) return '';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
