const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const ENV_PATH = path.join(__dirname, '../.env');

// In-memory reset tokens { token: { expiry } }
const resetTokens = {};

function updateEnvPassword(newPassword) {
    let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    content = content.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${newPassword}`);
    fs.writeFileSync(ENV_PATH, content);
    process.env.ADMIN_PASSWORD = newPassword;
}

function updateEnvField(key, value) {
    let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(content)) {
        content = content.replace(re, `${key}=${value}`);
    } else {
        content += `\n${key}=${value}`;
    }
    fs.writeFileSync(ENV_PATH, content);
    process.env[key] = value;
}

// POST /api/auth/login
exports.login = (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
};

// GET /api/auth/verify
exports.verify = (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ valid: false });
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true });
    } catch {
        res.status(401).json({ valid: false });
    }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
    const email = process.env.ADMIN_EMAIL;
    if (!email) return res.status(500).json({ error: 'Admin email not configured in .env' });
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        return res.status(500).json({ error: 'SMTP not configured' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    resetTokens[token] = { expiry: Date.now() + 15 * 60 * 1000 };

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
        });

        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.MAIL_USER,
            to: email,
            subject: '🔑 Server Monitor — Password Reset',
            html: `
            <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
              <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:28px 32px;text-align:center">
                <div style="font-size:42px;margin-bottom:8px">🔑</div>
                <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Password Reset</h1>
              </div>
              <div style="padding:28px 32px">
                <p style="color:#475569;font-size:15px;margin-bottom:24px">
                  You requested a password reset for <strong>Server Monitor</strong>.<br/>
                  Click the button below to set a new password. This link expires in <strong>15 minutes</strong>.
                </p>
                <div style="text-align:center;margin:24px 0">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">
                    Reset Password →
                  </a>
                </div>
                <p style="color:#94a3b8;font-size:13px;text-align:center">
                  If you didn't request this, ignore this email.
                </p>
              </div>
              <div style="padding:16px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
                SM Server Monitor — © 2026 Narendra Singh
              </div>
            </div>`,
        });

        res.json({ success: true, message: 'Reset link sent to your email' });
    } catch (e) {
        delete resetTokens[token];
        res.status(500).json({ error: 'Failed to send email: ' + e.message });
    }
};

// POST /api/auth/reset-password
exports.resetPassword = (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const record = resetTokens[token];
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link' });
    if (Date.now() > record.expiry) {
        delete resetTokens[token];
        return res.status(400).json({ error: 'Reset link has expired. Request a new one.' });
    }

    updateEnvPassword(password);
    delete resetTokens[token];
    res.json({ success: true, message: 'Password updated successfully' });
};

// GET /api/auth/profile
exports.getProfile = (req, res) => {
    res.json({
        username: process.env.ADMIN_USERNAME || '',
        email: process.env.ADMIN_EMAIL || '',
    });
};

// PUT /api/auth/profile
exports.updateProfile = (req, res) => {
    const { username, email, currentPassword, newPassword } = req.body;
    if (!currentPassword) return res.status(400).json({ error: 'Current password is required' });
    if (currentPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(400).json({ error: 'Current password is incorrect' });
    }
    if (username && username.trim()) updateEnvField('ADMIN_USERNAME', username.trim());
    if (email && email.trim()) updateEnvField('ADMIN_EMAIL', email.trim());
    if (newPassword) {
        if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
        updateEnvField('ADMIN_PASSWORD', newPassword);
    }
    res.json({ success: true, message: 'Profile updated successfully' });
};
