const User = require('../models/User');
const Server = require('../models/Server');
const Settings = require('../models/Settings');
const PaymentRequest = require('../models/PaymentRequest');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    lazyConnect: true,
    enableOfflineQueue: false,
});
redis.on('error', () => {});

// GET /api/admin/users
const computeIsActive = (u) => {
    if (u.isBlocked) return false;
    if (u.plan === 'free_trial') return !!(u.trialEndsAt && new Date() < new Date(u.trialEndsAt));
    if (!u.planEndsAt) return true;
    return new Date() < new Date(u.planEndsAt);
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().sort('-createdAt').lean();
        const serverCounts = await Server.aggregate([
            { $group: { _id: '$userId', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        serverCounts.forEach(s => { if (s._id) countMap[s._id.toString()] = s.count; });

        const result = users.map(u => ({
            ...u,
            serverCount: countMap[u._id.toString()] || 0,
            isActive: computeIsActive(u),
            siteLimit: u.plan === 'free_trial' ? 2 : u.plan === 'bronze' ? 5 : u.plan === 'silver' ? 15 : u.plan === 'gold' ? 30 : 2,
            trialDaysLeft: u.plan === 'free_trial' && u.trialEndsAt ? Math.max(0, Math.ceil((new Date(u.trialEndsAt) - Date.now()) / 86400000)) : 0,
        }));
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
    try {
        const { plan, planEndsAt, trialEndsAt, isBlocked, extendTrial, billing, planDuration } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (plan !== undefined) user.plan = plan;
        if (billing !== undefined) user.billing = billing;
        if (planDuration !== undefined) user.planDuration = planDuration;
        if (planEndsAt !== undefined) user.planEndsAt = new Date(planEndsAt);
        if (trialEndsAt !== undefined) user.trialEndsAt = new Date(trialEndsAt);
        if (isBlocked !== undefined) user.isBlocked = isBlocked;
        if (req.body.trialVerified !== undefined) user.trialVerified = req.body.trialVerified;
        if (extendTrial) {
            user.plan = 'free_trial';
            user.trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
        }

        user.$__.saveOptions = { validateModifiedOnly: true };
        await user.save();

        // Save plan history records for admin actions
        try {
            const PaymentRequest = require('../models/PaymentRequest');
            const now = new Date();

            // Paid plan assigned by admin
            if (plan && ['bronze', 'silver', 'gold'].includes(plan) && planEndsAt) {
                await PaymentRequest.create({
                    userId:    user._id,
                    userName:  user.name,
                    userEmail: user.email,
                    type:      'plan',
                    plan,
                    billing:   billing || user.billing || 'monthly',
                    amount:    0,
                    startDate: now,
                    utr:       `admin_plan_${Date.now()}`,
                    razorpay_payment_id: '',
                    status:    'approved',
                    reviewedAt: now,
                    planEndsAt: new Date(planEndsAt),
                });
            }

            // Trial extended by admin (+5 days)
            if (extendTrial) {
                await PaymentRequest.create({
                    userId:    user._id,
                    userName:  user.name,
                    userEmail: user.email,
                    type:      'verification',
                    plan:      null,
                    billing:   null,
                    amount:    0,
                    startDate: now,
                    utr:       `admin_trial_ext_${Date.now()}`,
                    razorpay_payment_id: '',
                    status:    'approved',
                    reviewedAt: now,
                    planEndsAt: user.trialEndsAt,
                });
            }
        } catch (_) {}

        // Send email notification if trial extended
        if (extendTrial) {
            try {
                const { sendEmail } = require('../services/email');
                const expiryDate = new Date(user.trialEndsAt).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
                await sendEmail(user.email, 'UptimeForge — Free Trial Extended by 5 Days', `
                <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
                  <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;text-align:center">
                    <div style="font-size:40px;margin-bottom:8px">🎉</div>
                    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">Free Trial Extended!</h1>
                  </div>
                  <div style="padding:28px 32px">
                    <p style="color:#374151;font-size:14px;line-height:1.7">Hi <strong>${user.name}</strong>,</p>
                    <p style="color:#374151;font-size:14px;line-height:1.7">
                      Great news! Your UptimeForge Free Trial has been extended by <strong>5 additional days</strong> by our admin team.
                    </p>
                    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 20px;margin:20px 0;text-align:center">
                      <div style="font-size:13px;color:#15803D;font-weight:600">New Trial Expiry Date</div>
                      <div style="font-size:20px;font-weight:800;color:#166534;margin-top:4px">${expiryDate}</div>
                    </div>
                    <p style="color:#374151;font-size:14px;line-height:1.7">
                      Your account is now active with full access to all Free Trial features. Take this time to explore UptimeForge and set up your site monitoring.
                    </p>
                    <div style="text-align:center;margin:24px 0">
                      <a href="https://servermonitor.narendrasingh.site" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
                        Go to Dashboard →
                      </a>
                    </div>
                  </div>
                  <div style="padding:14px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
                    UptimeForge — 24/7 Website Monitoring
                  </div>
                </div>`);
            } catch (emailErr) {
                console.error('[ExtendTrial] Email failed:', emailErr.message);
            }
        }

        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Archive full user data before deleting
        const DeletedUser   = require('../models/DeletedUser');
        const PingTarget    = require('../models/PingTarget');
        const PaymentRequest= require('../models/PaymentRequest');
        const uid = req.params.id;

        const [sites, pings, payments] = await Promise.all([
            Server.find({ userId: uid }).select('name url createdAt').lean(),
            PingTarget.find({ userId: uid }).select('name host port').lean(),
            PaymentRequest.find({ userId: uid }).select('amount type plan utr createdAt status').lean(),
        ]);
        const totalPaid = payments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amount || 0), 0);

        await DeletedUser.create({
            accountId:  user.accountId || null,
            name:       user.name,
            email:      user.email,
            phone:      user.phone || null,
            address:    user.address || null,
            plan:       user.plan,
            billing:    user.billing || 'monthly',
            planEndsAt: user.planEndsAt || null,
            state:      user.state || null,
            country:    user.country || null,
            siteCount:  sites.length,
            totalPaid,
            sites:      sites.map(s => ({ name: s.name, url: s.url, createdAt: s.createdAt })),
            pingTargets:pings.map(p => ({ name: p.name, host: p.host, port: p.port })),
            payments:   payments.map(p => ({ amount: p.amount, type: p.type, plan: p.plan, date: p.createdAt, utr: p.utr, status: p.status })),
            createdAt:  user.createdAt,
        });

        // Delete ALL user data
        await Server.deleteMany({ userId: uid });
        await require('../models/Recipient').deleteMany({ userId: uid });
        await require('../models/Alert').deleteMany({ userId: uid });
        await PingTarget.deleteMany({ userId: uid });
        await require('../models/Notification').deleteMany({ userId: uid });
        await PaymentRequest.deleteMany({ userId: uid });
        await require('../models/SupportTicket').deleteMany({ userId: uid });
        await User.findByIdAndDelete(uid);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/admin/deleted-users
exports.getDeletedUsers = async (req, res) => {
    try {
        const DeletedUser = require('../models/DeletedUser');
        const users = await DeletedUser.find().sort('-deletedAt');
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/admin/servers
exports.getServers = async (req, res) => {
    try {
        const servers = await Server.find().sort('-createdAt');
        res.json(servers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/admin/settings
exports.getSettings = async (req, res) => {
    try {
        const s = await Settings.get();
        res.json(s);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /api/admin/settings
exports.updateSettings = async (req, res) => {
    try {
        const s = await Settings.update(req.body);
        res.json(s);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/admin/payments
exports.getPayments = async (req, res) => {
    try {
        const requests = await PaymentRequest.find().sort('-createdAt');
        res.json(requests);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /api/admin/payments/:id
exports.deletePayment = async (req, res) => {
    try {
        const pr = await PaymentRequest.findByIdAndDelete(req.params.id);
        if (!pr) return res.status(404).json({ error: 'Record not found' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /api/admin/payments/:id/approve
exports.approvePayment = async (req, res) => {
    try {
        const pr = await PaymentRequest.findById(req.params.id);
        if (!pr) return res.status(404).json({ error: 'Not found' });
        if (pr.status !== 'pending') return res.status(400).json({ error: 'Already reviewed' });

        const endsAt = req.body.planEndsAt ? new Date(req.body.planEndsAt) : (() => {
            const d = new Date(); d.setMonth(d.getMonth() + 1); return d;
        })();

        pr.status     = 'approved';
        pr.reviewedAt = new Date();
        pr.planEndsAt = endsAt;
        await pr.save();

        const user = await User.findById(pr.userId);
        if (user) {
            if (pr.type === 'verification') {
                const settings = await Settings.findOne();
                const days = settings?.trialDays || 5;
                const trialEnds = new Date(); trialEnds.setDate(trialEnds.getDate() + days);
                user.trialVerified = true;
                user.trialEndsAt   = trialEnds;
                user.isActive      = true;
            } else {
                user.plan       = pr.plan;
                user.planEndsAt = endsAt;
                user.isActive   = true;
            }
            await user.save();
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /api/admin/payments/:id/reject
exports.rejectPayment = async (req, res) => {
    try {
        const pr = await PaymentRequest.findById(req.params.id);
        if (!pr) return res.status(404).json({ error: 'Not found' });
        if (pr.status !== 'pending') return res.status(400).json({ error: 'Already reviewed' });
        pr.status     = 'rejected';
        pr.reviewedAt = new Date();
        pr.adminNote  = req.body.note || '';
        await pr.save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/admin/abandoned-users
// Users who filled profile (phone set) but never paid the ₹2 verification fee
exports.getAbandonedUsers = async (req, res) => {
    try {
        const users = await User.find({
            trialVerified: false,
            isBlocked: { $ne: true },
        })
        .select('name email phone city state country plan createdAt followupSentAt noFreeTrial abandonReason')
        .sort('-createdAt')
        .limit(200)
        .lean();

        res.json(users.map(u => ({
            ...u,
            hoursSinceSignup: Math.floor((Date.now() - new Date(u.createdAt)) / 3600000),
            followupSent: !!u.followupSentAt,
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/admin/abandoned-users/:id/followup
// Send a personalised follow-up email to an abandoned user
exports.sendFollowupEmail = async (req, res) => {
    try {
        const { sendEmail } = require('../services/email');
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.trialVerified) return res.status(400).json({ error: 'User already activated trial' });

        const dashUrl = 'https://servermonitor.narendrasingh.site';
        const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">
          <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px;text-align:center">
            <div style="font-size:40px;margin-bottom:8px">🚀</div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Your account is ready!</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">UptimeForge — 24/7 Website Monitoring</p>
          </div>
          <div style="padding:32px">
            <p style="color:#475569;font-size:15px;margin:0 0 16px">
              Hi <strong style="color:#0f172a">${user.name}</strong>,
            </p>
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px">
              We noticed you created your UptimeForge account but haven't activated your free trial yet.
              You're just <strong style="color:#7c3aed">one step away</strong> from 24/7 monitoring for your websites!
            </p>
            <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:14px;padding:20px;margin-bottom:24px">
              <p style="margin:0 0 12px;font-weight:700;color:#5b21b6;font-size:14px">🎁 Your Free Trial includes:</p>
              <table style="width:100%;font-size:13px;color:#475569;border-collapse:collapse">
                <tr><td style="padding:5px 0">✅ Monitor 2 websites</td></tr>
                <tr><td style="padding:5px 0">✅ Instant downtime alerts (Email & WhatsApp)</td></tr>
                <tr><td style="padding:5px 0">✅ SSL & domain expiry warnings</td></tr>
                <tr><td style="padding:5px 0">✅ 5 days full access</td></tr>
              </table>
            </div>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:24px;text-align:center">
              <p style="margin:0;font-size:13px;color:#92400e">
                Activation fee: <strong style="font-size:18px;color:#7c3aed">₹2 only</strong> (one-time, non-refundable)
              </p>
            </div>
            <div style="text-align:center;margin-bottom:24px">
              <a href="${dashUrl}/pay?plan=verification"
                 style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;box-shadow:0 4px 16px rgba(124,58,237,0.35)">
                Activate Free Trial — ₹2 →
              </a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
              If you have any questions, reply to this email or visit our support page.<br/>
              UptimeForge — Never miss a website outage again.
            </p>
          </div>
        </div>`;

        await sendEmail(user.email, 'Your UptimeForge free trial is waiting — Activate for ₹2', html);

        // Mark followup sent
        await User.findByIdAndUpdate(user._id, { followupSentAt: new Date() });

        res.json({ success: true, message: `Follow-up email sent to ${user.email}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Enrich records: fill missing planEndsAt/startDate from user data for old records
async function enrichRecords(records) {
    // collect userIds that have verification records with missing planEndsAt
    const missingIds = [...new Set(
        records.filter(r => r.type === 'verification' && !r.planEndsAt).map(r => r.userId?.toString())
    )];
    let userMap = {};
    if (missingIds.length) {
        const users = await User.find({ _id: { $in: missingIds } }).select('trialEndsAt').lean();
        users.forEach(u => { userMap[u._id.toString()] = u; });
    }
    return records.map(r => {
        const rec = { ...r };
        // Fill planEndsAt for verification records (trial expiry)
        if (rec.type === 'verification' && !rec.planEndsAt) {
            const u = userMap[rec.userId?.toString()];
            if (u?.trialEndsAt) rec.planEndsAt = u.trialEndsAt;
        }
        // Fill startDate from createdAt if missing
        if (!rec.startDate) rec.startDate = rec.createdAt;
        return rec;
    });
}

// GET /api/admin/plan-history/summary — one row per user, latest plan + total count
exports.getPlanHistorySummary = async (req, res) => {
    try {
        const PaymentRequest = require('../models/PaymentRequest');
        const page  = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 25);

        const pipeline = [
            { $match: { status: 'approved' } },
            { $sort: { createdAt: -1 } },
            { $group: {
                _id: '$userId',
                latestRecord:  { $first: '$$ROOT' },
                totalRecords:  { $sum: 1 },
                totalAmount:   { $sum: '$amount' },
                firstPurchase: { $last: '$createdAt' },
            }},
            { $sort: { 'latestRecord.createdAt': -1 } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDoc' } },
            { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
        ];

        // Count total unique users
        const countPipeline = [...pipeline, { $count: 'total' }];
        const [countResult, rows] = await Promise.all([
            PaymentRequest.aggregate(countPipeline),
            PaymentRequest.aggregate([
                ...pipeline,
                { $skip: (page - 1) * limit },
                { $limit: limit },
            ]),
        ]);
        const total = countResult[0]?.total || 0;

        // Build result — enrich verification records with trialEndsAt
        const userIds = rows
            .filter(r => r.latestRecord.type === 'verification' && !r.latestRecord.planEndsAt)
            .map(r => r._id?.toString());
        let trialMap = {};
        if (userIds.length) {
            const users = await User.find({ _id: { $in: userIds } }).select('trialEndsAt').lean();
            users.forEach(u => { trialMap[u._id.toString()] = u.trialEndsAt; });
        }

        const records = rows.map(r => {
            const rec = { ...r.latestRecord };
            if (rec.type === 'verification' && !rec.planEndsAt) {
                rec.planEndsAt = trialMap[r._id?.toString()] || r.userDoc?.trialEndsAt || null;
            }
            if (!rec.startDate) rec.startDate = rec.createdAt;
            return {
                ...rec,
                totalRecords: r.totalRecords,
                totalAmount:  r.totalAmount,
                firstPurchase: r.firstPurchase,
                currentPlan:  r.userDoc?.plan || rec.plan,
                currentPlanEndsAt: r.userDoc?.planEndsAt || null,
                currentTrialEndsAt: r.userDoc?.trialEndsAt || null,
            };
        });

        res.json({ records, total, page, pages: Math.ceil(total / limit) });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/admin/plan-history?page=1&limit=20&userId=xxx
exports.getPlanHistory = async (req, res) => {
    try {
        const PaymentRequest = require('../models/PaymentRequest');
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, parseInt(req.query.limit) || 20);
        const userId = req.query.userId || null;

        const filter = { status: 'approved' };
        if (userId) filter.userId = userId;

        const [raw, total] = await Promise.all([
            PaymentRequest.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
            PaymentRequest.countDocuments(filter),
        ]);

        const records = await enrichRecords(raw);
        res.json({ records, total, page, pages: Math.ceil(total / limit) });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/admin/plan-history/user/:userId  (all history for one user, no pagination)
exports.getUserPlanHistory = async (req, res) => {
    try {
        const PaymentRequest = require('../models/PaymentRequest');
        const [raw, user] = await Promise.all([
            PaymentRequest.find({ userId: req.params.userId, status: 'approved' }).sort('-createdAt').lean(),
            User.findById(req.params.userId).select('name email plan billing planEndsAt trialEndsAt trialVerified').lean(),
        ]);
        const records = await enrichRecords(raw);
        res.json({ user, records });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/admin/clear-cache
exports.clearCache = async (req, res) => {
    try {
        const [sslKeys, domainKeys] = await Promise.all([
            redis.keys('ssl:*'),
            redis.keys('domain:*'),
        ]);
        let cleared = 0;
        if (sslKeys.length)    { await redis.del(...sslKeys);    cleared += sslKeys.length; }
        if (domainKeys.length) { await redis.del(...domainKeys); cleared += domainKeys.length; }
        res.json({ success: true, cleared, message: `Cleared ${cleared} cached entries` });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
