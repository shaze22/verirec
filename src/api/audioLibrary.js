import { supabase } from '../lib/supabase.js';

const BUCKET = 'recordings';

export async function uploadAudio({ blob, userId, sessionId, title, duration }) {
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
