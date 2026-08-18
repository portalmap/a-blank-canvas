// Módulo isolado de sincronização de avatares (server-only).
import type { SupabaseClient } from '@supabase/supabase-js';

export const AVATAR_BUCKET = 'avatars';
/** URL assinada de validade longa (10 anos) — o bucket é privado. */
export const AVATAR_SIGNED_TTL = 60 * 60 * 24 * 365 * 10;

const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

function extFor(contentType: string, sourceUrl: string): string {
  const known = EXT_BY_TYPE[contentType.split(';')[0]!.trim().toLowerCase()];
  if (known) return known;
  try {
    const guessed = new URL(sourceUrl).pathname.split('.').pop()?.toLowerCase() ?? '';
    if (/^[a-z0-9]{2,5}$/.test(guessed)) return guessed;
  } catch {
    // ignora
  }
  return 'png';
}

export interface AvatarCopyResult {
  avatar_url: string;
  avatar_path: string;
}

/** Baixa uma imagem remota, valida (image/*, máx. 5 MB) e sobe para o bucket privado local. */
export async function copyRemoteAvatar(
  admin: SupabaseClient<any>,
  userId: string,
  remoteUrl: string,
): Promise<AvatarCopyResult> {
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error(`download falhou: HTTP ${res.status}`);

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`content-type inesperado: ${contentType || 'ausente'}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error('imagem vazia');
  if (bytes.byteLength > MAX_BYTES) throw new Error('imagem acima de 5 MB');

  const path = `${userId}/${Date.now()}.${extFor(contentType, remoteUrl)}`;

  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, {
      contentType: contentType.split(';')[0]!.trim(),
      upsert: true,
      cacheControl: '3600',
    });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await admin.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_SIGNED_TTL);
  if (signError || !signed?.signedUrl) {
    throw signError ?? new Error('não foi possível assinar a URL');
  }

  return { avatar_url: signed.signedUrl, avatar_path: path };
}

export interface BackfillResult {
  success: true;
  migrated: number;
  failed: number;
  skipped: number;
  results: Array<{ id: string; status: 'migrated' | 'failed' | 'skipped'; detail?: string }>;
}

/**
 * Copia para o storage local todas as fotos de perfil que ainda apontam para uma
 * URL remota (a assinatura do Hub expira em 7 dias). Idempotente.
 */
export async function backfillHubAvatars(admin: SupabaseClient<any>): Promise<BackfillResult> {
  const { data: profilesToFix, error: fetchError } = await admin
    .from('profiles')
    .select('id, avatar_url, avatar_path, avatar_origem')
    .not('avatar_url', 'is', null);
  if (fetchError) throw fetchError;

  const localPrefix = `${process.env['SUPABASE_URL']}/storage/v1/`;
  const results: BackfillResult['results'] = [];

  for (const profile of profilesToFix ?? []) {
    const url = String(profile.avatar_url ?? '');
    if (!url || url.startsWith(localPrefix)) {
      results.push({ id: profile.id, status: 'skipped' });
      continue;
    }
    try {
      const copied = await copyRemoteAvatar(admin, profile.id, url);
      const { error: updErr } = await admin
        .from('profiles')
        .update({
          avatar_url: copied.avatar_url,
          avatar_path: profile.avatar_path ?? copied.avatar_path,
          avatar_origem: profile.avatar_origem === 'local' ? 'local' : 'hub',
        })
        .eq('id', profile.id);
      if (updErr) throw updErr;
      results.push({ id: profile.id, status: 'migrated' });
    } catch (e) {
      results.push({ id: profile.id, status: 'failed', detail: (e as Error)?.message });
    }
  }

  return {
    success: true,
    migrated: results.filter((r) => r.status === 'migrated').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results,
  };
}
