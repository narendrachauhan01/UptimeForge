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
        accountId: u.accountId || null,
        name: u.name,
        email: u.email,
        phone: u.phone || null,
        state: u.state || null,
        city: u.city || null,
        gender: u.gender || null,
        purpose: u.purpose || null,
        country: u.country || null,
        pincode: u.pincode || null,
        isGoogleUser: !!u.googleId,
        plan: u.plan,
        trialEndsAt: u.trialEndsAt,
        planEndsAt: u.planEndsAt,
        siteLimit: u.siteLimit,
        isActive: u.isActive,
        trialDaysLeft: u.trialDaysLeft,
        isBlocked: u.isBlocked,
        trialVerified: u.trialVerified ?? true,
        accountStatus: u.accountStatus || 'active',
        billing: u.billing || 'monthly',
        referredBy: u.referredBy || null,
        referralBonusUsed: u.referralBonusUsed || false,
        noFreeTrial: u.noFreeTrial || false,
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
        const { name, email, password, phone, address, city, state, country, referredBy } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            // Unverified user (didn't pay ₹2 yet) — guide them to login to continue
            if (!existing.trialVerified) {
                return res.status(400).json({
                    error: 'Account already exists. Please login to complete your payment and activate your account.',
                    code: 'ACCOUNT_EXISTS_UNVERIFIED',
                });
            }
            return res.status(400).json({ error: 'Email already registered. Please login.' });
        }

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
                referredBy: referredBy || null,
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
        // Check referral code
        const refCode = pending.referredBy || null;
        let referredBy = null;
        if (refCode) {
            const referrer = await User.findOne({ accountId: refCode }).select('_id accountId');
            if (referrer) referredBy = refCode;
        }

        // Check if email was previously deleted — no free trial
        const DeletedUser = require('../models/DeletedUser');
        const wasPreviouslyDeleted = !!(await DeletedUser.findOne({ email: pending.email }));

        const user = await User.create({
            name: pending.name, email: pending.email, phone: pending.phone,
            address: pending.address, city: pending.city, state: pending.state,
            country: pending.country, password: pending.password, trialEndsAt,
            referredBy,
            noFreeTrial: wasPreviouslyDeleted,
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
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });

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
            const DeletedUser = require('../models/DeletedUser');
            const wasPreviouslyDeleted = !!(await DeletedUser.findOne({ email: email.toLowerCase() }));
            user = await User.create({ name, email: email.toLowerCase(), googleId, trialEndsAt, noFreeTrial: wasPreviouslyDeleted });
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
        const resetUrl = `${process.env.FRONTEND_URL || process.env.DASHBOARD_URL || 'https://servermonitor.narendrasingh.site'}/reset-password?token=${token}&type=user`;
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
        const { phone, state, country, city, gender, purpose, pincode } = req.body;
        const user = await User.findByIdAndUpdate(
            req.userId,
            {
                phone: phone || null,
                state: state || null,
                country: country || null,
                pincode: pincode || null,
                ...(city !== undefined && { city: city || null }),
                ...(gender !== undefined && { gender: gender || null }),
                ...(purpose !== undefined && { purpose: purpose || null }),
            },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user: userPayload(user) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/users/referral-stats
exports.referralStats = async (req, res) => {
    try {
        const accountId = req.user?.accountId;
        if (!accountId) return res.json({ total: 0, paid: 0 });
        const total = await User.countDocuments({ referredBy: accountId });
        const paid  = await User.countDocuments({ referredBy: accountId, plan: { $ne: 'free_trial' } });
        res.json({ total, paid });
    } catch(e) { res.status(500).json({ error: e.message }); }
};

// POST /api/users/request-delete — send verification email
exports.requestDelete = async (req, res) => {
    try {
        if (req.isAdmin) return res.status(400).json({ error: 'Admin account cannot be deleted here' });
        const user = req.user;
        const crypto = require('crypto');
        const { sendEmail } = require('../services/email');
        const FRONTEND_URL = process.env.FRONTEND_URL || 'https://servermonitor.narendrasingh.site';

        // Generate token valid for 1 hour
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        // Save token on user
        await User.findByIdAndUpdate(user._id, {
            deleteToken: token,
            deleteTokenExpires: expires,
        });

        const link = `${FRONTEND_URL}/confirm-delete?token=${token}&uid=${user._id}`;
        const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
          <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px 32px;text-align:center">
            <div style="font-size:42px;margin-bottom:8px">⚠️</div>
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">Account Deletion Request</h1>
          </div>
          <div style="padding:28px 32px">
            <p style="color:#374151;font-size:14px;line-height:1.7">Hi <strong>${user.name}</strong>,</p>
            <p style="color:#374151;font-size:14px;line-height:1.7">We received a request to permanently delete your UptimeForge account (<strong>${user.email}</strong>).</p>
            <p style="color:#374151;font-size:14px;line-height:1.7">Once confirmed, all account information at UptimeForge — including the account, monitors, logs and settings — will be <strong style="color:#dc2626">lost and can not be recovered</strong>.</p>
            <div style="text-align:center;margin:28px 0">
              <a href="${link}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none">
                Confirm Account Deletion
              </a>
            </div>
            <p style="color:#94a3b8;font-size:13px;text-align:center">This link expires in <strong>1 hour</strong>. If you did not request this, ignore this email — your account is safe.</p>
          </div>
          <div style="padding:16px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
            UptimeForge &mdash; &copy; 2026 Narendra Singh
          </div>
        </div>`;

        await sendEmail(user.email, 'UptimeForge — Confirm Account Deletion', html);
        res.json({ success: true, message: 'Deletion verification email sent. Check your inbox.' });
    } catch(e) { res.status(500).json({ error: e.message }); }
};

// GET /api/users/confirm-delete?token=&uid= — verify and delete
exports.confirmDelete = async (req, res) => {
    try {
        const { token, uid } = req.query;
        if (!token || !uid) return res.status(400).json({ error: 'Invalid link' });

        const user = await User.findById(uid).select('+deleteToken +deleteTokenExpires');
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.deleteToken || user.deleteToken !== token) return res.status(400).json({ error: 'Invalid or expired deletion link' });
        if (new Date() > new Date(user.deleteTokenExpires)) return res.status(400).json({ error: 'Deletion link expired. Please request again.' });

        // Archive user data before deletion
        const uid2 = user._id;
        const Server         = require('../models/Server');
        const Recipient      = require('../models/Recipient');
        const Alert          = require('../models/Alert');
        const PingTarget     = require('../models/PingTarget');
        const Notification   = require('../models/Notification');
        const PaymentRequest = require('../models/PaymentRequest');
        const SupportTicket  = require('../models/SupportTicket');
        const DeletedUser    = require('../models/DeletedUser');

        const [sites, pings, payments] = await Promise.all([
            Server.find({ userId: uid2 }).select('name url createdAt').lean(),
            PingTarget.find({ userId: uid2 }).select('name host port').lean(),
            PaymentRequest.find({ userId: uid2 }).select('amount type plan utr createdAt status').lean(),
        ]);
        const totalPaid = payments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amount || 0), 0);

        await DeletedUser.create({
            accountId:   user.accountId || null,
            name:        user.name,
            email:       user.email,
            phone:       user.phone || null,
            address:     user.address || null,
            plan:        user.plan,
            billing:     user.billing || 'monthly',
            planEndsAt:  user.planEndsAt || null,
            state:       user.state || null,
            country:     user.country || null,
            siteCount:   sites.length,
            totalPaid,
            sites:       sites.map(s => ({ name: s.name, url: s.url, createdAt: s.createdAt })),
            pingTargets: pings.map(p => ({ name: p.name, host: p.host, port: p.port })),
            payments:    payments.map(p => ({ amount: p.amount, type: p.type, plan: p.plan, date: p.createdAt, utr: p.utr, status: p.status })),
            createdAt:   user.createdAt,
            deletedBy:   'user',
        }).catch(() => {}); // don't block deletion if archive fails

        // Now delete all user data
        await Server.deleteMany({ userId: uid2 });
        await Recipient.deleteMany({ userId: uid2 });
        await Alert.deleteMany({ userId: uid2 });
        await PingTarget.deleteMany({ userId: uid2 });
        await Notification.deleteMany({ userId: uid2 });
        await PaymentRequest.deleteMany({ userId: uid2 });
        await SupportTicket.deleteMany({ userId: uid2 });
        await User.findByIdAndDelete(uid2);

        res.json({ success: true, message: 'Account permanently deleted.' });
    } catch(e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/users/me
exports.deleteMe = async (req, res) => {
    try {
        if (req.isAdmin) return res.status(400).json({ error: 'Admin account cannot be deleted here' });
        const uid = req.userId;
        const Server      = require('../models/Server');
        const Recipient   = require('../models/Recipient');
        const Alert       = require('../models/Alert');
        const PingTarget  = require('../models/PingTarget');
        const Notification= require('../models/Notification');
        const PaymentRequest = require('../models/PaymentRequest');
        const SupportTicket  = require('../models/SupportTicket');
        await Server.deleteMany({ userId: uid });
        await Recipient.deleteMany({ userId: uid });
        await Alert.deleteMany({ userId: uid });
        await PingTarget.deleteMany({ userId: uid });
        await Notification.deleteMany({ userId: uid });
        await PaymentRequest.deleteMany({ userId: uid });
        await SupportTicket.deleteMany({ userId: uid });
        await User.deleteOne({ _id: uid });
        res.clearCookie('sm_token');
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
    let dynamicLimit;
    if (u.plan === 'free_trial') {
        dynamicLimit = settings.freeTrialSiteLimit ?? 2;
    } else {
        dynamicLimit = settings.plans?.[u.plan]?.sites ?? 2;
    }
    res.json({ ...userPayload(u), siteLimit: dynamicLimit });
};

// POST /api/users/support — create ticket
exports.contactSupport = async (req, res) => {
    try {
        const { name, email, subject, message, priority } = req.body;
        if (!name || !email || !subject || !message) return res.status(400).json({ error: 'All fields required' });
        const SupportTicket = require('../models/SupportTicket');
        const images = (req.files||[]).map(f => `/uploads/support/${f.filename}`);
        let accountId = null;
        if (req.userId) {
            const u = await User.findById(req.userId).select('accountId');
            accountId = u?.accountId || null;
        }
        const ticket = await SupportTicket.create({
            userId: req.userId || null,
            accountId,
            name, email, subject, message, images,
            priority: priority || 'medium',
        });
        console.log(`[Support] Ticket #${ticket._id} from ${email} — ${subject}`);
        res.json({ success: true, ticketId: ticket._id });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/users/support/my-tickets
exports.myTickets = async (req, res) => {
    try {
        const SupportTicket = require('../models/SupportTicket');
        // Match by userId OR by email (for tickets submitted before userId was stored)
        const tickets = await SupportTicket.find({
            $or: [{ userId: req.userId }, { email: req.user?.email }]
        }).sort('-createdAt');
        res.json(tickets);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/users/support/:id/mark-read
exports.markTicketRead = async (req, res) => {
    try {
        const SupportTicket = require('../models/SupportTicket');
        await SupportTicket.findOneAndUpdate(
            { _id: req.params.id, $or: [{ userId: req.userId }, { email: req.user?.email }] },
            { userUnread: false }
        );
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/users/support/:id/reply
exports.replyTicket = async (req, res) => {
    try {
        const SupportTicket = require('../models/SupportTicket');
        const t = await SupportTicket.findOne({
            _id: req.params.id,
            $or: [{ userId: req.userId }, { email: req.user?.email }]
        });
        if (!t) return res.status(404).json({ error: 'Ticket not found' });
        const images = (req.files||[]).map(f => `/uploads/support/${f.filename}`);
        t.replies.push({ from: 'user', message: req.body.message, images });
        t.adminUnread = true;  // notify admin
        t.userUnread  = false; // user replied = they saw it
        await t.save();
        res.json(t);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/users/logout
exports.logout = (req, res) => {
    res.clearCookie('sm_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ success: true });
};
