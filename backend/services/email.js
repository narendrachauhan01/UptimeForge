const nodemailer = require('nodemailer');

let transporter = null;

function resetTransporter() {
    transporter = null;
}

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });
    }
    return transporter;
}

function htmlToText(html) {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|tr|h\d)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&mdash;/g, '—')
        .replace(/&copy;/g, '©')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/^[ \t]+|[ \t]+$/gm, '')
        .trim();
}

async function sendEmail(to, subject, html) {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) return;
    try {
        const from = process.env.MAIL_FROM || process.env.MAIL_USER;
        const replyTo = process.env.MAIL_USER;
        await getTransporter().sendMail({
            from,
            to,
            replyTo,
            subject,
            html,
            text: htmlToText(html),
            headers: {
                'List-Unsubscribe': `<mailto:${replyTo}?subject=unsubscribe>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                'X-Entity-Ref-ID': `uptimeforge-${Date.now()}`,
            },
        });
        console.log(`[Email] Sent to ${to}: ${subject}`);
    } catch (e) {
        console.error(`[Email] Failed to send to ${to}:`, e.message);
    }
}

function downEmailHtml(name, url, time, statusCode) {
    return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
      <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:28px 32px;text-align:center">
        <div style="font-size:42px;margin-bottom:8px">🚨</div>
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Site Down Alert!</h1>
      </div>
      <div style="padding:28px 32px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase">Site Name</td><td style="padding:10px 0;color:#0f172a;font-weight:700;font-size:15px">${name}</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">URL</td><td style="padding:10px 0;border-top:1px solid #f1f5f9"><a href="${url}" style="color:#7c3aed;font-weight:600">${url}</a></td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Status</td><td style="padding:10px 0;border-top:1px solid #f1f5f9"><span style="background:#fee2e2;color:#dc2626;padding:4px 12px;border-radius:20px;font-weight:700;font-size:12px">DOWN ❌</span></td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Status Code</td><td style="padding:10px 0;border-top:1px solid #f1f5f9;color:#475569;font-weight:600">${statusCode ?? 'N/A'}</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Time</td><td style="padding:10px 0;border-top:1px solid #f1f5f9;color:#475569">${time}</td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#fff8f8;border:1px solid #fecdd3;border-radius:12px;color:#dc2626;font-size:14px;font-weight:600;text-align:center">
          ⚠️ Please check the server immediately!
        </div>
      </div>
      <div style="padding:16px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
        &copy; 2026 UptimeForge.in &ndash; <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Privacy Policy</a> | <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Terms &amp; Conditions</a>
      </div>
    </div>`;
}

function recoveredEmailHtml(name, url, time, statusCode) {
    return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 32px;text-align:center">
        <div style="font-size:42px;margin-bottom:8px">✅</div>
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Site Recovered!</h1>
      </div>
      <div style="padding:28px 32px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase">Site Name</td><td style="padding:10px 0;color:#0f172a;font-weight:700;font-size:15px">${name}</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">URL</td><td style="padding:10px 0;border-top:1px solid #f1f5f9"><a href="${url}" style="color:#7c3aed;font-weight:600">${url}</a></td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Status</td><td style="padding:10px 0;border-top:1px solid #f1f5f9"><span style="background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:20px;font-weight:700;font-size:12px">UP ✅</span></td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Status Code</td><td style="padding:10px 0;border-top:1px solid #f1f5f9;color:#475569;font-weight:600">${statusCode ?? 'N/A'}</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Time</td><td style="padding:10px 0;border-top:1px solid #f1f5f9;color:#475569">${time}</td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;color:#16a34a;font-size:14px;font-weight:600;text-align:center">
          🎉 Site is back up and running!
        </div>
      </div>
      <div style="padding:16px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
        &copy; 2026 UptimeForge.in &ndash; <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Privacy Policy</a> | <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Terms &amp; Conditions</a>
      </div>
    </div>`;
}

function sslEmailHtml(name, url, daysLeft, expiry) {
    const emoji = daysLeft <= 7 ? '🚨' : daysLeft <= 15 ? '⚠️' : '📢';
    const color = daysLeft <= 7 ? '#ef4444' : daysLeft <= 15 ? '#f59e0b' : '#7c3aed';
    return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
      <div style="background:linear-gradient(135deg,${color},${color}cc);padding:28px 32px;text-align:center">
        <div style="font-size:42px;margin-bottom:8px">${emoji}</div>
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">SSL Certificate Expiring!</h1>
      </div>
      <div style="padding:28px 32px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase">Site</td><td style="padding:10px 0;color:#0f172a;font-weight:700;font-size:15px">${name}</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">URL</td><td style="padding:10px 0;border-top:1px solid #f1f5f9"><a href="${url}" style="color:#7c3aed;font-weight:600">${url}</a></td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Expires</td><td style="padding:10px 0;border-top:1px solid #f1f5f9;color:#475569">${new Date(expiry).toDateString()}</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Days Left</td><td style="padding:10px 0;border-top:1px solid #f1f5f9"><span style="background:${color}20;color:${color};padding:4px 12px;border-radius:20px;font-weight:800;font-size:14px">${daysLeft} days</span></td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#faf5ff;border:1px solid #ddd6fe;border-radius:12px;color:#7c3aed;font-size:14px;font-weight:600;text-align:center">
          🔒 Please renew your SSL certificate immediately!
        </div>
      </div>
      <div style="padding:16px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
        &copy; 2026 UptimeForge.in &ndash; <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Privacy Policy</a> | <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Terms &amp; Conditions</a>
      </div>
    </div>`;
}

function otpEmailHtml(name, otp) {
    return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">
      <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px;text-align:center">
        <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
          <span style="font-size:26px">🔐</span>
        </div>
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">Verify your email</h1>
        <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px">UptimeForge</p>
      </div>
      <div style="padding:32px;text-align:center">
        <p style="color:#475569;font-size:15px;margin:0 0 24px">Hi <strong style="color:#0f172a">${name}</strong>, use the code below to complete your registration.</p>
        <div style="background:#f5f3ff;border:2px dashed #c4b5fd;border-radius:16px;padding:20px 32px;display:inline-block;margin-bottom:24px">
          <div style="font-size:36px;font-weight:900;letter-spacing:6px;color:#7c3aed;font-family:monospace;text-align:center;padding:0 8px">${otp}</div>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin:0">This code expires in <strong>10 minutes</strong>.<br/>If you didn't request this, you can safely ignore this email.</p>
      </div>
      <div style="padding:16px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
        &copy; 2026 UptimeForge.in &ndash; <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Privacy Policy</a> | <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Terms &amp; Conditions</a>
      </div>
    </div>`;
}

function pingDownEmailHtml(name, host, time) {
    return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
      <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:28px 32px;text-align:center">
        <div style="font-size:42px;margin-bottom:8px">🚨</div>
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Ping Alert!</h1>
        <p style="color:#fecdd3;margin:6px 0 0;font-size:14px">Host is unreachable</p>
      </div>
      <div style="padding:28px 32px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase">Target</td><td style="padding:10px 0;color:#0f172a;font-weight:700;font-size:15px">${name}</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Host</td><td style="padding:10px 0;border-top:1px solid #f1f5f9;color:#0f172a;font-weight:600">${host}</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Status</td><td style="padding:10px 0;border-top:1px solid #f1f5f9"><span style="background:#fee2e2;color:#dc2626;padding:4px 12px;border-radius:20px;font-weight:700;font-size:12px">DOWN ❌</span></td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Time</td><td style="padding:10px 0;border-top:1px solid #f1f5f9;color:#475569">${time}</td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#fff8f8;border:1px solid #fecdd3;border-radius:12px;color:#dc2626;font-size:14px;font-weight:600;text-align:center">
          ⚠️ Please check the server immediately!
        </div>
      </div>
      <div style="padding:16px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
        &copy; 2026 UptimeForge.in &ndash; <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Privacy Policy</a> | <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Terms &amp; Conditions</a>
      </div>
    </div>`;
}

function pingRecoveredEmailHtml(name, host, time) {
    return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 32px;text-align:center">
        <div style="font-size:42px;margin-bottom:8px">✅</div>
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Host Recovered!</h1>
        <p style="color:#bbf7d0;margin:6px 0 0;font-size:14px">Host is back online</p>
      </div>
      <div style="padding:28px 32px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase">Target</td><td style="padding:10px 0;color:#0f172a;font-weight:700;font-size:15px">${name}</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Host</td><td style="padding:10px 0;border-top:1px solid #f1f5f9;color:#0f172a;font-weight:600">${host}</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Status</td><td style="padding:10px 0;border-top:1px solid #f1f5f9"><span style="background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:20px;font-weight:700;font-size:12px">UP ✅</span></td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;border-top:1px solid #f1f5f9">Time</td><td style="padding:10px 0;border-top:1px solid #f1f5f9;color:#475569">${time}</td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;color:#16a34a;font-size:14px;font-weight:600;text-align:center">
          🎉 Host is back up and running!
        </div>
      </div>
      <div style="padding:16px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
        &copy; 2026 UptimeForge.in &ndash; <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Privacy Policy</a> | <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Terms &amp; Conditions</a>
      </div>
    </div>`;
}

module.exports = { sendEmail, resetTransporter, downEmailHtml, recoveredEmailHtml, sslEmailHtml, otpEmailHtml, pingDownEmailHtml, pingRecoveredEmailHtml };
