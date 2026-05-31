// Email helper using Resend API — set RESEND_API_KEY in Vercel env to activate
const FROM = 'VeriRec <noreply@verirec.app>';

export function buildCalendarUrl(date, time, duration, counselorName, location) {
  if (!date || !time) return '';
  const [y, mo, d] = date.split('-');
  const [h, m] = time.split(':').map(Number);
  const startStr = `${y}${mo}${d}T${String(h).padStart(2,'0')}${String(m).padStart(2,'0')}00`;
  const endMins = h * 60 + m + (duration || 60);
  const eh = String(Math.floor(endMins / 60)).padStart(2, '0');
  const em = String(endMins % 60).padStart(2, '0');
  const endStr = `${y}${mo}${d}T${eh}${em}00`;
  const text = encodeURIComponent(`Temujanji Kaunseling - ${counselorName}`);
  const details = encodeURIComponent(`Temujanji kaunseling bersama ${counselorName}`);
  const loc = location ? `&location=${encodeURIComponent(location)}` : '';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startStr}/${endStr}&details=${details}${loc}`;
}

export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) return null;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) console.error('Resend error:', await res.text());
    return res.ok;
  } catch (err) {
    console.error('sendEmail error:', err);
    return null;
  }
}

const base = (content) => `
<!DOCTYPE html>
<html lang="ms">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px}
.card{background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:32px;border:1px solid #e2e8f0}
.logo{display:flex;align-items:center;gap:10px;margin-bottom:24px}
.logo-box{width:36px;height:36px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center}
.logo-text{font-size:18px;font-weight:700;color:#1e293b}
h1{font-size:20px;font-weight:700;color:#0f172a;margin:0 0 8px}
p{color:#475569;font-size:14px;line-height:1.6;margin:8px 0}
.btn{display:inline-block;background:#2563eb;color:#fff!important;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin:16px 0}
.warn{background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin:16px 0}
.warn p{color:#92400e;margin:0}
.footer{text-align:center;margin-top:24px;font-size:12px;color:#94a3b8}
</style></head>
<body><div class="card">${content}<div class="footer">VeriRec · Platform Rakaman Sesi Profesional Malaysia<br>
<a href="https://verirec.vercel.app" style="color:#2563eb">verirec.vercel.app</a></div></div></body></html>`;

export function welcomeEmail(name) {
  return {
    subject: 'Selamat Datang ke VeriRec!',
    html: base(`
      <div class="logo">
        <div class="logo-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
        <span class="logo-text">VeriRec</span>
      </div>
      <h1>Selamat Datang, ${name || 'Rakan Profesional'}!</h1>
      <p>Terima kasih kerana mendaftar dengan VeriRec — platform rakaman dan analitik sesi profesional untuk Malaysia.</p>
      <p>Anda kini boleh:</p>
      <ul style="color:#475569;font-size:14px;line-height:2">
        <li>Rakam sesi temuduga dengan transkripsi AI automatik</li>
        <li>Jana laporan profesional dalam beberapa saat</li>
        <li>Simpan dan cari semua sesi dengan selamat</li>
      </ul>
      <a href="https://verirec.vercel.app/dashboard" class="btn">Mula Sesi Pertama →</a>
      <p>Pelan Percuma anda termasuk <strong>2 sesi/bulan</strong>. Naik taraf bila bersedia.</p>
    `),
  };
}

export function limitWarningEmail(used, limit) {
  const pct = Math.round((used / limit) * 100);
  return {
    subject: `Amaran: ${pct}% had sesi VeriRec telah digunakan`,
    html: base(`
      <div class="logo">
        <div class="logo-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
        <span class="logo-text">VeriRec</span>
      </div>
      <h1>Had Sesi Hampir Penuh</h1>
      <div class="warn"><p>⚠️ Anda telah menggunakan <strong>${used} daripada ${limit} sesi</strong> (${pct}%) bulan ini.</p></div>
      <p>Apabila had dicapai, anda tidak dapat memulakan sesi baru sehingga bulan hadapan atau naik taraf pelan.</p>
      <a href="https://verirec.vercel.app/pricing" class="btn">Naik Taraf Sekarang →</a>
      <p style="font-size:12px;color:#94a3b8">Had reset secara automatik pada 1hb setiap bulan.</p>
    `),
  };
}

export function paymentFailedEmail() {
  return {
    subject: 'Tindakan Diperlukan: Pembayaran VeriRec Gagal',
    html: base(`
      <div class="logo">
        <div class="logo-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
        <span class="logo-text">VeriRec</span>
      </div>
      <h1>Pembayaran Gagal</h1>
      <p>Pembayaran langganan VeriRec anda telah gagal diproses. Perkhidmatan anda masih aktif buat sementara waktu.</p>
      <div class="warn"><p>⚠️ Sila kemas kini kaedah pembayaran anda untuk mengelakkan gangguan perkhidmatan.</p></div>
      <a href="https://verirec.vercel.app/settings" class="btn">Kemas Kini Pembayaran →</a>
      <p>Jika anda memerlukan bantuan, hubungi kami di <a href="mailto:hello@verirec.app" style="color:#2563eb">hello@verirec.app</a></p>
    `),
  };
}

export function teamInviteEmail(inviterName, teamName, roleLabel) {
  return {
    subject: `Jemputan untuk menyertai pasukan "${teamName}" di VeriRec`,
    html: base(`
      <div class="logo">
        <div class="logo-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
        <span class="logo-text">VeriRec</span>
      </div>
      <h1>Anda Dijemput!</h1>
      <p><strong>${inviterName}</strong> telah menjemput anda untuk menyertai pasukan <strong>"${teamName}"</strong> di VeriRec sebagai <strong>${roleLabel}</strong>.</p>
      <p>VeriRec adalah platform rakaman dan analitik sesi profesional yang patuh PDPA untuk Malaysia.</p>
      <a href="https://verirec.vercel.app/auth?mode=register" class="btn">Terima Jemputan →</a>
      <p style="font-size:12px;color:#94a3b8">Jika anda sudah ada akaun, log masuk dengan e-mel yang sama untuk bergabung dengan pasukan secara automatik.</p>
    `),
  };
}

export function reportReadyEmail(sessionTitle, sessionId) {
  return {
    subject: `Laporan AI sedia: ${sessionTitle || 'Sesi VeriRec'}`,
    html: base(`
      <div class="logo">
        <div class="logo-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
        <span class="logo-text">VeriRec</span>
      </div>
      <h1>Laporan AI Sedia ✓</h1>
      <p>Laporan AI untuk sesi <strong>${sessionTitle || 'Sesi Anda'}</strong> telah berjaya dijana.</p>
      <p>Laporan merangkumi ringkasan eksekutif, penemuan utama, tahap risiko, dan cadangan tindakan susulan.</p>
      <a href="https://verirec.vercel.app/session/${sessionId}" class="btn">Lihat Laporan →</a>
      <p style="font-size:12px;color:#94a3b8">Laporan ini dilindungi dan hanya boleh diakses oleh anda.</p>
    `),
  };
}

export function monthlySummaryEmail(name, sessionsUsed, sessionsLimit, plan) {
  const planLabel = { free: 'Percuma', starter: 'Starter', pro: 'Pro', business: 'Perniagaan' }[plan] || plan;
  return {
    subject: `Ringkasan Bulanan VeriRec — ${sessionsUsed} sesi selesai`,
    html: base(`
      <div class="logo">
        <div class="logo-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
        <span class="logo-text">VeriRec</span>
      </div>
      <h1>Ringkasan Bulanan, ${name || 'Rakan Profesional'}!</h1>
      <p>Berikut adalah ringkasan aktiviti VeriRec anda bulan lepas:</p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:4px 0;color:#0369a1"><strong>📊 Jumlah Sesi Selesai:</strong> ${sessionsUsed} sesi</p>
        <p style="margin:4px 0;color:#0369a1"><strong>📋 Had Pelan ${planLabel}:</strong> ${sessionsLimit === -1 ? 'Tanpa Had' : `${sessionsLimit} sesi/bulan`}</p>
      </div>
      <p>Had sesi anda telah direset secara automatik. Anda kini bermula dengan had penuh untuk bulan ini.</p>
      <a href="https://verirec.vercel.app/dashboard" class="btn">Lihat Dashboard →</a>
      ${sessionsLimit !== -1 && sessionsUsed >= sessionsLimit * 0.8 ? `<p style="font-size:12px;color:#64748b">💡 Pertimbangkan untuk naik taraf pelan bagi kapasiti yang lebih besar.</p>` : ''}
    `),
  };
}

export function newAppointmentEmail(counselorName, client) {
  return {
    subject: `Tempahan Baru: ${client.name} — ${client.date} pukul ${client.time}`,
    html: base(`
      <div class="logo">
        <div class="logo-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
        <span class="logo-text">VeriRec</span>
      </div>
      <h1>📅 Tempahan Baru Diterima</h1>
      <p>Salam ${counselorName || 'Kaunselor'},</p>
      <p>Anda menerima permintaan temujanji baru:</p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:4px 0;color:#0369a1"><strong>👤 Klien:</strong> ${client.name}</p>
        <p style="margin:4px 0;color:#0369a1"><strong>📱 Telefon:</strong> ${client.phone || '-'}</p>
        <p style="margin:4px 0;color:#0369a1"><strong>📧 E-mel:</strong> ${client.email || '-'}</p>
        <p style="margin:4px 0;color:#0369a1"><strong>📅 Tarikh:</strong> ${client.date}</p>
        <p style="margin:4px 0;color:#0369a1"><strong>🕐 Masa:</strong> ${client.time}</p>
        ${client.issue ? `<p style="margin:8px 0 4px;color:#0369a1"><strong>Isu:</strong> <em>${client.issue}</em></p>` : ''}
      </div>
      <a href="https://verirec.vercel.app/kaunselor/appointments" class="btn">Sahkan Temujanji →</a>
      <p style="font-size:12px;color:#94a3b8">Sila sahkan atau laraskan temujanji dalam sistem.</p>
    `),
  };
}

export function appointmentConfirmedEmail(counselorName, date, time, duration, isReschedule = false, counselor = {}, rescheduleReason = null) {
  const accentColor = isReschedule ? '#3b82f6' : '#10b981';
  const accentLight = isReschedule ? '#eff6ff' : '#f0fdf4';
  const accentBorder = isReschedule ? '#93c5fd' : '#86efac';
  const accentText  = isReschedule ? '#1e40af' : '#166534';
  return {
    subject: isReschedule ? `🔄 Tarikh Temujanji Dikemaskini — ${date} jam ${time}` : `✅ Temujanji Disahkan — ${date} jam ${time}`,
    html: base(`
      <div class="logo">
        <div class="logo-box" style="background:${accentColor}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
        <span class="logo-text">VeriRec</span>
      </div>
      <div style="text-align:center;padding:8px 0 16px">
        <div style="font-size:36px;margin-bottom:8px">${isReschedule ? '🔄' : '✅'}</div>
        <h1 style="margin:0;font-size:20px;color:#0f172a">${isReschedule ? 'Tarikh Temujanji Dikemaskini' : 'Temujanji Anda Disahkan'}</h1>
        <p style="margin:6px 0 0;color:#64748b;font-size:14px">${isReschedule ? `Temujanji anda bersama <strong>${counselorName}</strong> telah dijadual semula.` : `Temujanji anda bersama <strong>${counselorName}</strong> telah disahkan.`}</p>
      </div>
      <div style="background:${accentLight};border:1px solid ${accentBorder};border-radius:12px;padding:20px;margin:16px 0">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;font-size:16px;width:30px">📅</td><td style="padding:6px 0;color:#374151;font-size:14px"><strong>Tarikh</strong></td><td style="padding:6px 0;color:${accentText};font-size:14px;font-weight:600;text-align:right">${date}</td></tr>
          <tr><td style="padding:6px 0;font-size:16px">🕐</td><td style="padding:6px 0;color:#374151;font-size:14px"><strong>Masa</strong></td><td style="padding:6px 0;color:${accentText};font-size:14px;font-weight:600;text-align:right">${time}</td></tr>
          <tr><td style="padding:6px 0;font-size:16px">⏱</td><td style="padding:6px 0;color:#374151;font-size:14px"><strong>Tempoh</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right">${duration || 60} minit</td></tr>
          ${counselor.location ? `<tr><td style="padding:6px 0;font-size:16px">📍</td><td style="padding:6px 0;color:#374151;font-size:14px"><strong>Lokasi</strong></td><td style="padding:6px 0;color:#374151;font-size:13px;text-align:right">${counselor.location}</td></tr>` : ''}
        </table>
      </div>
      ${isReschedule && rescheduleReason ? `<div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:14px 16px;margin:12px 0"><p style="margin:0 0 4px;color:#713f12;font-weight:600;font-size:13px">📝 Sebab Penukaran Tarikh</p><p style="margin:0;color:#78350f;font-size:13px">${rescheduleReason}</p></div>` : ''}
      ${(counselor.phone || counselor.email) ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:12px 0"><p style="margin:0 0 8px;color:#1e293b;font-weight:600;font-size:13px">Hubungi Kaunselor Anda</p>${counselor.phone ? `<p style="margin:3px 0;color:#475569;font-size:13px">📱 <a href="tel:${counselor.phone}" style="color:#2563eb;text-decoration:none">${counselor.phone}</a></p>` : ''}${counselor.email ? `<p style="margin:3px 0;color:#475569;font-size:13px">📧 <a href="mailto:${counselor.email}" style="color:#2563eb">${counselor.email}</a></p>` : ''}</div>` : ''}
      ${counselor.calendarUrl ? `<div style="text-align:center;margin:16px 0"><a href="${counselor.calendarUrl}" style="display:inline-block;background:${accentColor};color:#fff!important;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">📅 Tambah ke Google Calendar</a></div>` : ''}
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:12px 16px;margin:12px 0">
        <p style="margin:0;color:#92400e;font-size:12px">⚠️ <strong>Pembatalan / Tukar Tarikh:</strong> Hubungi kaunselor anda sekurang-kurangnya 24 jam lebih awal.</p>
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:16px">E-mel ini dihantar melalui sistem VeriRec bagi pihak kaunselor anda.</p>
    `),
  };
}

export function appointmentReminderEmail(clientName, counselorName, date, time, location) {
  return {
    subject: `⏰ Peringatan Temujanji Esok — ${date} jam ${time}`,
    html: base(`
      <div class="logo">
        <div class="logo-box" style="background:#10b981"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
        <span class="logo-text">VeriRec</span>
      </div>
      <div style="text-align:center;padding:8px 0 16px">
        <div style="font-size:36px;margin-bottom:8px">⏰</div>
        <h1 style="margin:0;font-size:20px;color:#0f172a">Peringatan Temujanji</h1>
        <p style="margin:6px 0 0;color:#64748b;font-size:14px">Hai <strong>${clientName}</strong>, temujanji anda adalah <strong>esok</strong>.</p>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:16px 0">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;font-size:16px;width:30px">👤</td><td style="padding:6px 0;color:#374151;font-size:14px"><strong>Kaunselor</strong></td><td style="padding:6px 0;color:#065f46;font-size:14px;font-weight:600;text-align:right">${counselorName}</td></tr>
          <tr><td style="padding:6px 0;font-size:16px">📅</td><td style="padding:6px 0;color:#374151;font-size:14px"><strong>Tarikh</strong></td><td style="padding:6px 0;color:#065f46;font-size:14px;font-weight:600;text-align:right">${date}</td></tr>
          <tr><td style="padding:6px 0;font-size:16px">🕐</td><td style="padding:6px 0;color:#374151;font-size:14px"><strong>Masa</strong></td><td style="padding:6px 0;color:#065f46;font-size:14px;font-weight:600;text-align:right">${time}</td></tr>
          ${location ? `<tr><td style="padding:6px 0;font-size:16px">📍</td><td style="padding:6px 0;color:#374151;font-size:14px"><strong>Lokasi</strong></td><td style="padding:6px 0;color:#374151;font-size:13px;text-align:right">${location}</td></tr>` : ''}
        </table>
      </div>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:12px 16px;margin:12px 0">
        <p style="margin:0;color:#92400e;font-size:12px">⚠️ Jika anda tidak dapat hadir, sila hubungi kaunselor anda secepat mungkin untuk membatalkan atau menjadual semula.</p>
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:16px">Peringatan automatik daripada VeriRec — sistem pengurusan kaunseling digital.</p>
    `),
  };
}

export function subscriptionCancelledEmail(planLabel) {
  return {
    subject: 'Langganan VeriRec Anda Telah Dibatalkan',
    html: base(`
      <div class="logo">
        <div class="logo-box"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22"><polyline points="2,12 5,8 8,16 11,6 14,18 17,8 19,13 21,12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
        <span class="logo-text">VeriRec</span>
      </div>
      <h1>Langganan Dibatalkan</h1>
      <p>Langganan <strong>${planLabel}</strong> anda telah dibatalkan. Akaun anda kini menggunakan Pelan Percuma (2 sesi/bulan).</p>
      <p>Semua data dan laporan anda masih selamat dan boleh diakses.</p>
      <a href="https://verirec.vercel.app/pricing" class="btn">Langgan Semula →</a>
    `),
  };
}
