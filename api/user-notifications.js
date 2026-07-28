import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import { sendEmail, sendTelegram, welcomeEmail, limitWarningEmail, newAppointmentEmail, appointmentConfirmedEmail, invoiceEmail, buildCalendarUrl } from './_mailer.js';
import { buildInvoiceDoc } from '../src/lib/invoicePdfDoc.js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const type = req.query.type || req.body?.type;

    // ── Public (no auth) appointment notifications ──────────────────────
    if (type === 'new-appointment') {
      const appointment_id = req.query.appointment_id || req.body?.appointment_id;
      if (!appointment_id) return res.status(400).json({ error: 'Missing appointment_id' });

      const { data: appt } = await supabaseAdmin
        .from('appointments')
        .select('client_name, client_phone, client_email, presenting_issue, requested_date, requested_time, counselor_id, created_at')
        .eq('id', appointment_id).single();
      if (!appt) return res.status(404).json({ error: 'Appointment not found' });

      // Reject if appointment was created more than 15 minutes ago — prevents replay with old IDs
      if (Date.now() - new Date(appt.created_at).getTime() > 15 * 60 * 1000) {
        return res.status(400).json({ error: 'Notification window expired' });
      }

      const { data: { user: counselor } } = await supabaseAdmin.auth.admin.getUserById(appt.counselor_id);
      const { data: profile } = await supabaseAdmin
        .from('counselor_profiles').select('display_name, telegram_chat_id, telegram_enabled').eq('user_id', appt.counselor_id).single();

      if (counselor?.email) {
        const { subject, html, from } = newAppointmentEmail(profile?.display_name || 'Counselor', {
          name: appt.client_name,
          phone: appt.client_phone,
          email: appt.client_email,
          date: appt.requested_date,
          time: appt.requested_time?.slice(0, 5),
          issue: appt.presenting_issue,
        });
        await sendEmail({ to: counselor.email, subject, html, from });
      }

      // Telegram notification to counselor
      if (profile?.telegram_enabled && profile?.telegram_chat_id) {
        const time = appt.requested_time ? appt.requested_time.slice(0, 5) : '';
        await sendTelegram(
          profile.telegram_chat_id,
          `🆕 <b>New Appointment Request</b>\n\nClient: <b>${appt.client_name}</b>\nDate: ${appt.requested_date}${time ? ` at ${time}` : ''}\nIssue: ${appt.presenting_issue || '—'}\n\nOpen Kaunselor to confirm.`
        );
      }

      return res.status(200).json({ ok: true });
    }

    // ── End public notifications ──────────────────────────────────────

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    if (type === 'appointment-confirmed') {
      const appointment_id = req.query.appointment_id || req.body?.appointment_id;
      if (!appointment_id) return res.status(400).json({ error: 'Missing appointment_id' });

      const { data: appt } = await supabaseAdmin
        .from('appointments')
        .select('client_email, confirmed_date, confirmed_time, requested_date, requested_time, counselor_id, status, counselor_notes')
        .eq('id', appointment_id)
        .eq('counselor_id', user.id)
        .single();
      if (!appt || !appt.client_email) return res.status(200).json({ ok: true, skipped: 'no email' });

      const [{ data: profile }, { data: { user: counselorUser } }] = await Promise.all([
        supabaseAdmin.from('counselor_profiles')
          .select('display_name, session_duration_minutes, phone, klinik_address')
          .eq('user_id', appt.counselor_id).single(),
        supabaseAdmin.auth.admin.getUserById(appt.counselor_id),
      ]);

      const date = appt.confirmed_date || appt.requested_date;
      const time = (appt.confirmed_time || appt.requested_time)?.slice(0, 5);
      const duration = profile?.session_duration_minutes || 60;
      const isReschedule = appt.status === 'rescheduled';
      const counselorName = profile?.display_name || 'Kaunselor';
      const rescheduleReason = isReschedule && appt.counselor_notes
        ? appt.counselor_notes.replace('[Rescheduled] ', '').trim()
        : null;
      const confirmedNotes = !isReschedule && appt.counselor_notes ? appt.counselor_notes : null;

      const calendarUrl = buildCalendarUrl(date, time, duration, counselorName, profile?.klinik_address);
      const counselorInfo = {
        phone: profile?.phone || null,
        email: counselorUser?.email || null,
        location: profile?.klinik_address || null,
        calendarUrl,
      };

      const { subject, html, from } = appointmentConfirmedEmail(counselorName, date, time, duration, isReschedule, counselorInfo, rescheduleReason, confirmedNotes);
      await sendEmail({ to: appt.client_email, subject, html, from });
      return res.status(200).json({ ok: true });
    }


    // Email an invoice to the client, with a letterhead PDF attached.
    if (type === 'invoice-sent') {
      const invoice_id = req.query.invoice_id || req.body?.invoice_id;
      if (!invoice_id) return res.status(400).json({ error: 'Missing invoice_id' });

      const { data: invoice, error: invErr } = await supabaseAdmin
        .from('counselor_invoices')
        .select('id, user_id, invoice_number, invoice_date, due_date, line_items, subtotal, tax_rate, tax_amount, total, status, notes, subjects(name, email, phone)')
        .eq('id', invoice_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (invErr) throw invErr;
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const client = invoice.subjects;
      if (!client?.email) {
        return res.status(400).json({ error: 'This client has no email address. Add one in their client file, or share the invoice by WhatsApp instead.' });
      }

      const { data: profile } = await supabaseAdmin
        .from('counselor_profiles')
        .select('display_name, credentials, registration_number, klinik_name, klinik_address, phone, website, official_email, org_registration_no, payment_url, logo_data, signature_data')
        .eq('user_id', user.id).maybeSingle();

      const payUrl = profile?.payment_url || '';
      let attachments;
      try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        buildInvoiceDoc(doc, invoice, {
          clientName: client.name || '', clientEmail: client.email, clientPhone: client.phone || '',
          profile: profile || null, payUrl, counselorEmail: user.email || '',
        });
        const b64 = Buffer.from(doc.output('arraybuffer')).toString('base64');
        attachments = [{ filename: `invoice-${invoice.invoice_number || invoice.id}.pdf`, content: b64 }];
      } catch (e) {
        // Non-fatal — the email body carries the same figures
        console.error('invoice pdf gen failed:', e?.message);
      }

      const { subject, html, from } = invoiceEmail(invoice, {
        counselorName: profile?.display_name || 'your counselor',
        clientName: client.name || '',
        payUrl,
        counselorPhone: profile?.phone || '',
        counselorEmail: profile?.official_email || user.email || '',
      });
      const sent = await sendEmail({ to: client.email, subject, html, from, attachments });
      if (sent === null) return res.status(503).json({ error: 'Email service is not configured. Please try WhatsApp or PDF instead.' });
      if (sent === false) return res.status(502).json({ error: 'The email provider rejected the message. Please try again.' });

      // Draft invoices become "sent" once they actually reach the client
      if (invoice.status === 'draft') {
        const { error: updErr } = await supabaseAdmin.from('counselor_invoices')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('id', invoice.id);
        if (updErr) console.error('invoice status update failed:', updErr.message);
      }

      return res.status(200).json({ ok: true, to: client.email, attached: !!attachments });
    }

    if (type === 'welcome') {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0];
      const { subject, html } = welcomeEmail(name);
      await sendEmail({ to: user.email, subject, html });
      return res.status(200).json({ ok: true });
    }

    if (type === 'limit-warning') {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('sessions_used, sessions_limit, warning_sent')
        .eq('user_id', user.id)
        .single();

      if (!sub || sub.sessions_limit === -1) return res.status(200).json({ ok: true });

      const pct = sub.sessions_used / sub.sessions_limit;
      if (pct < 0.8 || sub.warning_sent) return res.status(200).json({ ok: true, skipped: true });

      const { subject, html } = limitWarningEmail(sub.sessions_used, sub.sessions_limit);
      await sendEmail({ to: user.email, subject, html });

      await supabaseAdmin.from('subscriptions')
        .update({ warning_sent: true })
        .eq('user_id', user.id);

      return res.status(200).json({ ok: true, sent: true });
    }

    if (type === 'follow-up-reminder') {
      const { data: sessions } = await supabaseAdmin
        .from('sessions')
        .select('id, title, report')
        .eq('user_id', user.id)
        .not('report', 'is', null);

      const withItems = (sessions || []).filter(s =>
        Array.isArray(s.report?.followUpItems) && s.report.followUpItems.length > 0
      );
      if (withItems.length === 0) return res.status(200).json({ ok: true, skipped: true });

      const count = withItems.reduce((acc, s) => acc + s.report.followUpItems.length, 0);
      const listHtml = withItems.slice(0, 3).map(s =>
        `<li><a href="https://www.verirec.app/session/${s.id}" style="color:#2563eb">${s.title || 'Session'}</a> — ${s.report.followUpItems.length} item(s)</li>`
      ).join('');

      await sendEmail({
        to: user.email,
        subject: `Reminder: ${count} follow-up item${count !== 1 ? 's' : ''} pending`,
        html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
          <div style="background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:32px;border:1px solid #e2e8f0">
            <h2 style="color:#0f172a;margin:0 0 8px">📋 Pending Follow-up Items</h2>
            <p style="color:#475569">You have <strong>${count} follow-up item${count !== 1 ? 's' : ''}</strong> that have not been completed:</p>
            <ul style="color:#475569;font-size:14px;line-height:2">${listHtml}</ul>
            <a href="https://www.verirec.app/dashboard" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin:16px 0">Check Dashboard →</a>
            <p style="font-size:12px;color:#94a3b8;margin-top:16px">VeriRec · <a href="https://www.verirec.app" style="color:#2563eb">www.verirec.app</a></p>
          </div></body></html>`,
      });
      return res.status(200).json({ ok: true, sent: true, count });
    }

    return res.status(400).json({ error: 'Unknown notification type' });
  } catch (err) {
    console.error('user-notifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
