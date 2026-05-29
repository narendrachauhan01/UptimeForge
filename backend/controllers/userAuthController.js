const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Settings = require('../models/Settings');
const PendingRegistration = require('../models/PendingRegistration');
const { sendEmail, otpEmailHtml } = require('../services/email');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
};

const setTokenCookie = (res, token) => res.cookie('sm_token', token, COOKIE_OPTS);

function genOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function userPayload(u) {
    return {
        id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone || null,
        state: u.state || null,
        country: u.country || null,
        isGoogleUser: !!u.googleId,
        plan: u.plan,
        trialEndsAt: u.trialEndsAt,
        planEndsAt: u.planEndsAt,
        siteLimit: u.siteLimit,
        isActive: u.isActive,
        trialDaysLeft: u.trialDaysLeft,
        isBlocked: u.isBlocked,
        trialVerified: u.trialVerified ?? true,
    };
}

// In-memory user reset tokens
const userResetTokens = {};

// GET /api/users/config
exports.getConfig = (req, res) => {
    res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' });
};

// POST /api/users/register/send-otp
exports.sendOtp = async (req, res) => {
    try {
        const { name, email, password, phone, address, city, state, country } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ error: 'Email already registered. Please login.' });

        const otp = genOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await PendingRegistration.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                name, email: email.toLowerCase(),
                phone: phone || null, address: address || null,
                city: city || null, state: state || null,
                country: country || null, password,
                otp, otpExpiry, createdAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await sendEmail(email, 'Verify your email — ServerMonitor', otpEmailHtml(name, otp));
        res.json({ message: 'OTP sent to your email' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /api/users/register/verify-otp
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

        const pending = await PendingRegistration.findOne({ email: email.toLowerCase() });
        if (!pending) return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
        if (new Date() > pending.otpExpiry) return res.status(400).json({ error: 'OTP expired. Request a new one.' });
        if (pending.otp !== otp) return res.status(400).json({ error: 'Invalid OTP. Please try again.' });

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ error: 'Email already registered.' });

        const settings = await Settings.get();
        const trialEndsAt = new Date(Date.now() + settings.trialDays * 24 * 60 * 60 * 1000);
        const user = await User.create({
            name: pending.name, email: pending.email, phone: pending.phone,
            address: pending.address, city: pending.city, state: pending.state,
            country: pending.country, password: pending.password, trialEndsAt,
        });

        await PendingRegistration.deleteOne({ email: email.toLowerCase() });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        setTokenCookie(res, token);
        res.json({ token, user: userPayload(user) });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

// POST /api/users/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });
        if (!user.password) return res.status(401).json({ error: 'This account uses Google Sign-In. Please use "Continue with Google" to login.' });
        if (!(await user.comparePassword(password))) return res.status(401).json({ error: 'Invalid email or password' });
        if (user.isBlocked) return res.status(403).json({ error: 'Account blocked. Contact support.' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        setTokenCookie(res, token);
        res.json({ token, user: userPayload(user) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /api/users/google-auth
exports.googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: 'Google credential required' });
        if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google Sign-In not configured' });

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { name, email, sub: googleId } = payload;

        let isNewUser = false;
        let user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            if (user.isBlocked) return res.status(403).json({ error: 'Account blocked. Contact support.' });
            if (!user.googleId) { user.googleId = googleId; await user.save(); }
        } else {
            isNewUser = true;
            const settings = await Settings.get();
            const trialEndsAt = new Date(Date.now() + settings.trialDays * 24 * 60 * 60 * 1000);
            user = await User.create({ name, email: email.toLowerCase(), googleId, trialEndsAt });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        setTokenCookie(res, token);
        res.json({ token, user: userPayload(user), isNewUser });
    } catch (e) {
        res.status(400).json({ error: 'Google Sign-In failed: ' + e.message });
    }
};

// PUT /api/users/change-password
exports.changePassword = async (req, res) => {
    try {
        if (req.isAdmin) return res.status(400).json({ error: 'Admin password cannot be changed here' });
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both current and new password required' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const match = await user.comparePassword(currentPassword);
        if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /api/users/forgot-password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.json({ success: true });
        const token = crypto.randomBytes(32).toString('hex');
        userResetTokens[token] = { userId: user._id, expiry: Date.now() + 15 * 60 * 1000 };
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}&type=user`;
        await sendEmail(
            user.email,
            'UptimeForge — Reset Your Password',
            `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0a1e;color:#fff;border-radius:16px;">
                <h2 style="color:#a78bfa;margin-bottom:8px;">Reset Your Password</h2>
                <p style="color:rgba(255,255,255,0.7);margin-bottom:24px;">Hi ${user.name}, click the button below to reset your password. This link expires in 15 minutes.</p>
                <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">Reset Password</a>
                <p style="color:rgba(255,255,255,0.4);font-size:13px;margin-top:24px;">If you didn't request this, ignore this email.</p>
            </div>`
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /api/users/reset-password
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
        const record = userResetTokens[token];
        if (!record || Date.now() > record.expiry) {
            delete userResetTokens[token];
            return res.status(400).json({ error: 'Reset link expired or invalid' });
        }
        const user = await User.findById(record.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.password = newPassword;
        await user.save();
        delete userResetTokens[token];
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res) => {
    try {
        if (req.isAdmin) return res.status(400).json({ error: 'Use admin settings' });
        const { phone, state, country } = req.body;
        const user = await User.findByIdAndUpdate(
            req.userId,
            { phone: phone || null, state: state || null, country: country || null },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user: userPayload(user) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /api/users/me
exports.deleteMe = async (req, res) => {
    try {
        if (req.isAdmin) return res.status(400).json({ error: 'Admin account cannot be deleted here' });
        await User.deleteOne({ _id: req.userId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/users/me
exports.getMe = async (req, res) => {
    if (req.isAdmin) return res.json({ isAdmin: true, name: 'Admin', plan: 'admin', siteLimit: 9999, isActive: true });
    const settings = await Settings.get();
    const u = req.user;
    const planConfig = settings.plans?.[u.plan];
    const dynamicLimit = planConfig ? planConfig.sites : 2;
    res.json({ ...userPayload(u), siteLimit: dynamicLimit });
};

// POST /api/users/logout
exports.logout = (req, res) => {
    res.clearCookie('sm_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ success: true });
};
