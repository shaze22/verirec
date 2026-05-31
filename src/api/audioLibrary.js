import { supabase } from '../lib/supabase.js';

const BUCKET = 'recordings';

// Storage quota per plan (bytes)
export const STORAGE_LIMITS = {
  free:       500  * 1024 * 1024,       // 500 MB
  counselor:  5    * 1024 * 1024 * 1024, // 5 GB
  starter:    10   * 1024 * 1024 * 1024, // 10 GB
  pro:        50   * 1024 * 1024 * 1024, // 50 GB
  enterprise: 200  * 1024 * 1024 * 1024, // 200 GB
};

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function getStorageUsage(userId) {
  const { data, error } = await supabase
    .from('audio_library')
    .select('file_size')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).reduce((sum, r) => sum + (r.file_size || 0), 0);
}

export async function uploadAudio({ blob, userId, sessionId, title, duration, plan = 'free' }) {
  // Quota check
  const limit = STORAGE_LIMITS[plan] ?? STORAGE_LIMITS.free;
  const used = await getStorageUsage(userId);
  if (used + blob.size > limit) {
    const limitLabel = formatBytes(limit);
    throw new Error(`Had storan ${limitLabel} telah dicapai. Sila padamkan rakaman lama atau naik taraf pelan.`);
  }

  const ext = blob.type?.includes('mp4') ? 'm4a' : 'webm';
  const fileName = `${Date.now()}.${ext}`;
  const path = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.from('audio_library').insert({
    user_id: userId,
    session_id: sessionId || null,
    storage_path: path,
    file_name: fileName,
    duration: Math.round(duration || 0),
    file_size: blob.size,
    mime_type: blob.type || 'audio/webm',
    title: title || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getAudioLibrary(userId) {
  const { data, error } = await supabase
    .from('audio_library')
    .select('*, session:sessions(id, title, profession), subject:subjects(id, name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function assignAudio(id, { sessionId, subjectId }) {
  const update = { session_id: sessionId ?? null, subject_id: subjectId ?? null };
  const { data, error } = await supabase
    .from('audio_library')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAudioTitle(id, title) {
  const { data, error } = await supabase
    .from('audio_library')
    .update({ title })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAudio(id, storagePath) {
  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from('audio_library').delete().eq('id', id);
  if (error) throw error;
}
