import { supabase } from '../lib/supabase.js';

export async function logEvent(userId, action, resourceType = null, resourceId = null, resourceName = null, metadata = {}) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName,
      metadata: { ...metadata, userAgent: navigator.userAgent.substring(0, 200) },
    });
  } catch { /* audit logging must never crash the app */ }
}

export async function getAuditLogs(limit = 200) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
