const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { resetTransporter } = require('../services/email');

const ENV_PATH = path.join(__dirname, '../.env');

function updateEnv(key, value) {
    let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content += `\n${key}=${value}`;
    }
    fs.writeFileSync(ENV_PATH, content);
    process.env[key] = value;
}

// GET /api/email-config/status
exports.getStatus = (req, res) => {
    const configured = !!(process.env.MAIL_USER && process.env.MAIL_PASS);
    res.json({
        configured,
        mailUser: process.env.MAIL_USER || '',
        mailFrom: process.env.MAIL_FROM || '',
    });
};

// PUT /api/email-config/update
exports.update = (req, res) => {
    try {
        const { mailUser, mailPass, mailFrom } = req.body;
        if (!mailUser || !mailPass) return res.status(400).json({ error: 'Email and password required' });

        updateEnv('MAIL_USER', mailUser);
        updateEnv('MAIL_PASS', mailPass);
        updateEnv('MAIL_FROM', mailFrom || `Server Monitor <${mailUser}>`);
        resetTransporter();

        res.json({ success: true, mailUser, mailFrom: mailFrom || `Server Monitor <${mailUser}>` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /api/email-config/reset
exports.reset = (req, res) => {
    try {
        updateEnv('MAIL_USER', '');
        updateEnv('MAIL_PASS', '');
        updateEnv('MAIL_FROM', '');
        resetTransporter();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/email-config/test
exports.test = async (req, res) => {
    const { to } = req.body;
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        return res.status(400).json({ error: 'SMTP not configured' });
    }
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
        });
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.MAIL_USER,
            to: to || process.env.MAIL_USER,
            subject: '✅ Server Monitor — Email Test',
            html: `<div style="font-family:Inter,sans-serif;padding:28px;background:#f8fafc;border-radius:16px;max-width:500px;margin:0 auto">
                <div style="text-align:center;font-size:48px;margin-bottom:16px">✅</div>
                <h2 style="text-align:center;color:#7c3aed;margin-bottom:8px">Email Connected!</h2>
                <p style="text-align:center;color:#64748b;font-size:15px">Your SMTP email is working correctly.<br>Alerts will be sent to this address.</p>
                <div style="margin-top:20px;padding:14px;background:#ede9fe;border-radius:10px;text-align:center;color:#7c3aed;font-size:13px;font-weight:600">
                    SM Server Monitor &mdash; © 2026 Narendra Singh
                </div>
            </div>`,
        });
        res.json({ success: true, sentTo: to || process.env.MAIL_USER });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
