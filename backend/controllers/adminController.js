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
