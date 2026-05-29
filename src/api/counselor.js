import { supabase } from '../lib/supabase.js';

// ── Profile ──────────────────────────────────────────────────────────

export async function getCounselorProfile(userId) {
  const { data, error } = await supabase
    .from('counselor_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCounselorProfile(profile) {
  const { data, error } = await supabase
    .from('counselor_profiles').upsert(profile, { onConflict: 'user_id' }).select().single();
  if (error) throw error;
  return data;
}

// ── Slots ────────────────────────────────────────────────────────────

export async function getSlots(counselorId) {
  const { data, error } = await supabase
    .from('appointment_slots').select('*')
    .eq('counselor_id', counselorId).order('day_of_week').order('start_time');
  if (error) throw error;
  return data || [];
}

export async function addSlot(counselorId, slot) {
  const { data, error } = await supabase
    .from('appointment_slots').insert({ counselor_id: counselorId, ...slot }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSlot(slotId) {
  const { error } = await supabase.from('appointment_slots').delete().eq('id', slotId);
  if (error) throw error;
}

// ── Appointments ─────────────────────────────────────────────────────

export async function getAppointments(counselorId) {
  const { data, error } = await supabase
    .from('appointments').select('*, subjects(name, ic_number, phone, email)')
    .eq('counselor_id', counselorId).order('requested_date').order('requested_time');
  if (error) throw error;
  return data || [];
}

export async function updateAppointment(id, updates) {
  const { data, error } = await supabase
    .from('appointments').update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── Public booking (anon) ─────────────────────────────────────────────

export async function getCounselorByCode(code) {
  const { data, error } = await supabase.rpc('get_counselor_by_booking_code', { p_code: code });
  if (error) throw error;
  return data;
}

export async function getBookedTimes(counselorId, date) {
  const { data, error } = await supabase.rpc('get_booked_times', {
    p_counselor_id: counselorId, p_date: date,
  });
  if (error) throw error;
  return data || [];
}

export async function submitAppointment(bookingCode, form) {
  const { data, error } = await supabase.rpc('submit_appointment', {
    p_code: bookingCode,
    p_name: form.name,
    p_email: form.email,
    p_phone: form.phone,
    p_ic: form.ic || null,
    p_dob: form.dob || null,
    p_address: form.address || null,
    p_date: form.date,
    p_time: form.time,
    p_issue: form.issue || null,
    p_consent: form.consent,
  });
  if (error) throw error;
  return data;
}

// ── Helpers ────────────────────────────────────────────────────────────

export function generateBookingCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const DAYS_MS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

export const CREDENTIALS_OPTIONS = [
  'Kaunselor Berdaftar (BKR)',
  'Kaunselor Pelajar Berdaftar (BKPP)',
  'M.Sc. Kaunseling',
  'Ph.D Kaunseling',
  'Ahli Psikologi',
  'Jurupulih Anggota',
  'Pekerja Sosial Perubatan',
];

export const SPECIALIZATIONS_OPTIONS = [
  'Keluarga & Perkahwinan',
  'Kanak-kanak & Remaja',
  'Kemurungan & Kebimbangan',
  'Trauma & PTSD',
  'Penyalahgunaan Bahan',
  'Kerjaya & Akademik',
  'Perhubungan & Sosial',
  'Kesihatan Mental Dewasa',
  'Krisis & Pencegahan Bunuh Diri',
];
