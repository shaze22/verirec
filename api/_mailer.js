// Email helper using Resend API — set RESEND_API_KEY in Vercel env to activate
const FROM = 'VeriRec <noreply@verirec.app>';
const FROM_KAUNSELOR = 'Kaunselor <noreply@kaunselor.app>';

export function buildCalendarUrl(date, time, duration, counselorName, location) {
  if (!date || !time) return '';
  const [y, mo, d] = date.split('-');
  const [h, m] = time.split(':').map(Number);
  const startStr = `${y}${mo}${d}T${String(h).padStart(2,'0')}${String(m).padStart(2,'0')}00`;
  const endMins = h * 60 + m + (duration || 60);
  const eh = String(Math.floor(endMins / 60)).padStart(2, '0');
  const em = String(endMins % 60).padStart(2, '0');
  const endStr = `${y}${mo}${d}T${eh}${em}00`;
  const text = encodeURIComponent(`Counseling Appointment - ${counselorName}`);
  const details = encodeURIComponent(`Counseling session with ${counselorName}`);
  const loc = location ? `&location=${encodeURIComponent(location)}` : '';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startStr}/${endStr}&details=${details}${loc}`;
}

export async function sendEmail({ to, subject, html, from, attachments }) {
  if (!process.env.RESEND_API_KEY) return null;
  try {
    const payload = { from: from || FROM, to: [to], subject, html };
    // attachments: [{ filename, content }] where content is a base64 string
    if (Array.isArray(attachments) && attachments.length) payload.attachments = attachments;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error('Resend error:', await res.text());
    return res.ok;
  } catch (err) {
    console.error('sendEmail error:', err);
    return null;
  }
}

// Telegram Bot helper — send a text message to a chat_id
export async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) console.error('Telegram error:', await res.text());
    return res.ok;
  } catch (err) {
    console.error('sendTelegram error:', err);
    return false;
  }
}

const base = (content) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:32px 16px}
.wrap{max-width:540px;margin:0 auto}
.header{background:#1e3a5f;border-radius:12px 12px 0 0;padding:24px 32px;display:flex;align-items:center;gap:12px}
.logo-box{width:40px;height:40px;background:#2563eb;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.logo-name{font-size:18px;font-weight:700;color:#fff}
.logo-tag{font-size:11px;color:#93c5fd;margin-top:1px}
.card{background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e2e8f0;border-top:none}
h1{font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px}
p{color:#475569;font-size:14px;line-height:1.7;margin:10px 0}
.btn{display:inline-block;background:#2563eb;color:#fff!important;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:600;font-size:14px;margin:20px 0}
.info-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:18px 20px;margin:16px 0}
.info-box p{color:#0369a1;margin:5px 0;font-size:14px}
.warn{background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin:16px 0}
.warn p{color:#92400e;margin:0;font-size:13px}
.footer{text-align:center;padding:20px 0 0;font-size:12px;color:#94a3b8}
</style></head>
<body><div class="wrap">
<div class="header">
  <div class="logo-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
  <div><div class="logo-name">VeriRec</div><div class="logo-tag">Professional Session Platform</div></div>
</div>
<div class="card">${content}
<div class="footer">VeriRec · AI-Powered Professional Session Platform<br>
<a href="https://www.verirec.app" style="color:#2563eb">www.verirec.app</a> · <a href="mailto:hello@verirec.app" style="color:#2563eb">hello@verirec.app</a>
</div></div></div></body></html>`;

// Kaunselor-branded template (violet)
const kaunsBase = (content) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f5f3ff;margin:0;padding:32px 16px}
.wrap{max-width:540px;margin:0 auto}
.header{background:#4c1d95;border-radius:12px 12px 0 0;padding:24px 32px;display:flex;align-items:center;gap:12px}
.logo-box{width:40px;height:40px;background:#8b5cf6;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.logo-name{font-size:18px;font-weight:700;color:#fff}
.logo-tag{font-size:11px;color:#c4b5fd;margin-top:1px}
.card{background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #ede9fe;border-top:none}
h1{font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px}
p{color:#475569;font-size:14px;line-height:1.7;margin:10px 0}
.btn{display:inline-block;background:#7c3aed;color:#fff!important;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:600;font-size:14px;margin:20px 0}
.info-box{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:18px 20px;margin:16px 0}
.info-box p{color:#5b21b6;margin:5px 0;font-size:14px}
.warn{background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin:16px 0}
.warn p{color:#92400e;margin:0;font-size:13px}
.footer{text-align:center;padding:20px 0 0;font-size:12px;color:#94a3b8}
</style></head>
<body><div class="wrap">
<div class="header">
  <div class="logo-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
  <div><div class="logo-name">Kaunselor</div><div class="logo-tag">Digital Counselling Platform</div></div>
</div>
<div class="card">${content}
<div class="footer">Kaunselor · Digital Counselling Platform<br>
<a href="https://kaunselor.app" style="color:#7c3aed">kaunselor.app</a> · <a href="mailto:hello@kaunselor.app" style="color:#7c3aed">hello@kaunselor.app</a>
</div></div></div></body></html>`;

export function welcomeEmail(name) {
  return {
    subject: 'Welcome to VeriRec!',
    html: base(`
      <h1>Welcome, ${name || 'Professional'}! 👋</h1>
      <p>Thank you for signing up with VeriRec — the AI-powered session recording and analytics platform.</p>
      <p>You can now:</p>
      <ul style="color:#475569;font-size:14px;line-height:2.2;padding-left:20px">
        <li>Record sessions with automatic AI transcription</li>
        <li>Generate professional reports in seconds</li>
        <li>Store and search all sessions securely</li>
        <li>Track risk levels and follow-up deadlines</li>
      </ul>
      <a href="https://www.verirec.app/analytics" class="btn">Start Your First Session →</a>
      <p style="font-size:13px;color:#94a3b8">Your Free plan includes 2 sessions/month. Upgrade anytime.</p>
    `),
  };
}

export function limitWarningEmail(used, limit) {
  const pct = Math.round((used / limit) * 100);
  return {
    subject: `⚠️ ${pct}% of your session limit used`,
    html: base(`
      <h1>Session Limit Almost Reached</h1>
      <div class="warn"><p>⚠️ You have used <strong>${used} of ${limit} sessions</strong> (${pct}%) this month.</p></div>
      <p>When the limit is reached, you won't be able to start new sessions until next month or until you upgrade.</p>
      <a href="https://www.verirec.app/pricing" class="btn">Upgrade Now →</a>
      <p style="font-size:12px;color:#94a3b8">Limits reset automatically on the 1st of each month.</p>
    `),
  };
}

export function paymentFailedEmail() {
  return {
    subject: 'Action Required: VeriRec Payment Failed',
    html: base(`
      <h1>Payment Failed</h1>
      <p>Your VeriRec subscription payment could not be processed. Your service remains active for now.</p>
      <div class="warn"><p>⚠️ Please update your payment method to avoid any service interruption.</p></div>
      <a href="https://www.verirec.app/settings" class="btn">Update Payment →</a>
      <p>If you need help, contact us at <a href="mailto:hello@verirec.app" style="color:#2563eb">hello@verirec.app</a></p>
    `),
  };
}

export function teamInviteEmail(inviterName, teamName, roleLabel) {
  return {
    subject: `You've been invited to join "${teamName}" on VeriRec`,
    html: base(`
      <h1>You're Invited!</h1>
      <p><strong>${inviterName}</strong> has invited you to join the team <strong>"${teamName}"</strong> on VeriRec as <strong>${roleLabel}</strong>.</p>
      <p>VeriRec is a PDPA-compliant AI-powered professional session recording and analytics platform.</p>
      <a href="https://www.verirec.app/auth?mode=register" class="btn">Accept Invitation →</a>
      <p style="font-size:12px;color:#94a3b8">If you already have an account, sign in with the same email to join the team automatically.</p>
    `),
  };
}

export function reportReadyEmail(sessionTitle, sessionId) {
  return {
    subject: `AI Report Ready: ${sessionTitle || 'VeriRec Session'}`,
    html: base(`
      <h1>AI Report Ready ✓</h1>
      <p>The AI report for session <strong>${sessionTitle || 'Your Session'}</strong> has been successfully generated.</p>
      <p>The report includes an executive summary, key findings, risk level assessment, and recommended follow-up actions.</p>
      <a href="https://www.verirec.app/session/${sessionId}" class="btn">View Report →</a>
      <p style="font-size:12px;color:#94a3b8">This report is protected and accessible only by you.</p>
    `),
  };
}

export function monthlySummaryEmail(name, sessionsUsed, sessionsLimit, plan) {
  const planLabel = { free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business' }[plan] || plan;
  return {
    subject: `VeriRec Monthly Summary — ${sessionsUsed} sessions completed`,
    html: base(`
      <h1>Monthly Summary, ${name || 'Professional'}!</h1>
      <p>Here's a summary of your VeriRec activity last month:</p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:4px 0;color:#0369a1"><strong>📊 Sessions Completed:</strong> ${sessionsUsed} sessions</p>
        <p style="margin:4px 0;color:#0369a1"><strong>📋 ${planLabel} Plan Limit:</strong> ${sessionsLimit === -1 ? 'Unlimited' : `${sessionsLimit} sessions/month`}</p>
      </div>
      <p>Your session limit has been automatically reset. You're starting fresh with your full allowance for this month.</p>
      <a href="https://www.verirec.app/dashboard" class="btn">View Dashboard →</a>
      ${sessionsLimit !== -1 && sessionsUsed >= sessionsLimit * 0.8 ? `<p style="font-size:12px;color:#64748b">💡 Consider upgrading your plan for more capacity.</p>` : ''}
    `),
  };
}

export function newAppointmentEmail(counselorName, client) {
  return {
    subject: `📅 New Booking: ${client.name} — ${client.date} at ${client.time}`,
    from: FROM_KAUNSELOR,
    html: kaunsBase(`
      <h1>New Appointment Request 📅</h1>
      <p>Hello ${counselorName || 'Counselor'},</p>
      <p>You have a new appointment request waiting for your confirmation.</p>
      <div class="info-box">
        <p><strong>👤 Client:</strong> ${client.name}</p>
        <p><strong>📱 Phone:</strong> ${client.phone || '—'}</p>
        <p><strong>📧 Email:</strong> ${client.email || '—'}</p>
        <p><strong>📅 Requested Date:</strong> ${client.date}</p>
        <p><strong>🕐 Requested Time:</strong> ${client.time}</p>
        ${client.issue ? `<p><strong>Presenting Issue:</strong> <em>${client.issue}</em></p>` : ''}
      </div>
      <a href="https://kaunselor.app/kaunselor/appointments" class="btn">Review &amp; Confirm →</a>
      <p style="font-size:13px;color:#94a3b8">Please confirm or decline this appointment in your dashboard.</p>
    `),
  };
}

export function appointmentConfirmedEmail(counselorName, date, time, duration, isReschedule = false, counselor = {}, rescheduleReason = null, notes = null) {
  return {
    subject: isReschedule ? `🔄 Appointment Rescheduled — ${date} at ${time}` : `✅ Appointment Confirmed — ${date} at ${time}`,
    from: FROM_KAUNSELOR,
    html: kaunsBase(`
      <div style="text-align:center;padding:8px 0 20px">
        <div style="font-size:48px;margin-bottom:12px">${isReschedule ? '🔄' : '✅'}</div>
        <h1 style="margin:0">${isReschedule ? 'Appointment Rescheduled' : 'Appointment Confirmed'}</h1>
        <p style="margin:8px 0 0">${isReschedule ? `Your appointment with <strong>${counselorName}</strong> has been rescheduled.` : `Your appointment with <strong>${counselorName}</strong> is confirmed.`}</p>
      </div>
      <div class="info-box">
        <p><strong>📅 Date:</strong> ${date}</p>
        <p><strong>🕐 Time:</strong> ${time}</p>
        <p><strong>⏱ Duration:</strong> ${duration || 60} minutes</p>
        ${counselor.location ? `<p><strong>📍 Location:</strong> ${counselor.location}</p>` : ''}
      </div>
      ${isReschedule && rescheduleReason ? `<div class="warn"><p>📝 <strong>Reason for rescheduling:</strong> ${rescheduleReason}</p></div>` : ''}
      ${!isReschedule && notes ? `<div class="warn"><p>📝 <strong>Note from your counselor:</strong> ${notes}</p></div>` : ''}
      ${(counselor.phone || counselor.email) ? `<div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:16px 20px;margin:14px 0"><p style="margin:0 0 8px;color:#4c1d95;font-weight:600;font-size:13px">Contact Your Counselor</p>${counselor.phone ? `<p style="margin:4px 0;color:#475569;font-size:13px">📱 <a href="tel:${counselor.phone}" style="color:#7c3aed">${counselor.phone}</a></p>` : ''}${counselor.email ? `<p style="margin:4px 0;color:#475569;font-size:13px">📧 <a href="mailto:${counselor.email}" style="color:#7c3aed">${counselor.email}</a></p>` : ''}</div>` : ''}
      ${counselor.calendarUrl ? `<div style="text-align:center;margin:20px 0"><a href="${counselor.calendarUrl}" style="display:inline-block;background:#7c3aed;color:#fff!important;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:600;font-size:14px">📅 Add to Google Calendar</a></div>` : ''}
      <div class="warn"><p>⚠️ <strong>Cancellation policy:</strong> Please contact your counselor at least 24 hours in advance to cancel or reschedule.</p></div>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:16px">This email was sent by Kaunselor on behalf of your counselor.</p>
    `),
  };
}

export function appointmentReminderEmail(clientName, counselorName, date, time, location) {
  return {
    subject: `⏰ Appointment Reminder — Tomorrow, ${date} at ${time}`,
    from: FROM_KAUNSELOR,
    html: kaunsBase(`
      <div style="text-align:center;padding:8px 0 20px">
        <div style="font-size:48px;margin-bottom:12px">⏰</div>
        <h1 style="margin:0">Appointment Tomorrow</h1>
        <p style="margin:8px 0 0">Hi <strong>${clientName}</strong>, this is a reminder for your counseling session tomorrow.</p>
      </div>
      <div class="info-box">
        <p><strong>👤 Counselor:</strong> ${counselorName}</p>
        <p><strong>📅 Date:</strong> ${date}</p>
        <p><strong>🕐 Time:</strong> ${time}</p>
        ${location ? `<p><strong>📍 Location:</strong> ${location}</p>` : ''}
      </div>
      <div class="warn"><p>⚠️ If you cannot make it, please contact your counselor as soon as possible to cancel or reschedule.</p></div>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:16px">Automated reminder from Kaunselor — Digital Counselling Platform.</p>
    `),
  };
}

export function subscriptionCancelledEmail(planLabel) {
  return {
    subject: 'Your VeriRec Subscription Has Been Cancelled',
    html: base(`
      <h1>Subscription Cancelled</h1>
      <p>Your <strong>${planLabel}</strong> subscription has been cancelled. Your account is now on the Free Plan (2 sessions/month).</p>
      <p>All your data and reports remain safe and accessible.</p>
      <a href="https://www.verirec.app/pricing" class="btn">Resubscribe →</a>
    `),
  };
}
