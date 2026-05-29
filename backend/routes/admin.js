const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Server = require('../models/Server');
const Settings = require('../models/Settings');
const PaymentRequest = require('../models/PaymentRequest');
const auth = require('../middleware/auth');
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { lazyConnect: true, enableOfflineQueue: false });
redis.on('error', () => {});

function adminOnly(req, res, next) {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
}

// All users list
router.get('/users', auth, adminOnly, async (req, res) => {
    try {
        const users = await User.find().sort('-createdAt').lean({ virtuals: true });
        const serverCounts = await Server.aggregate([
            { $group: { _id: '$userId', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        serverCounts.forEach(s => { if (s._id) countMap[s._id.toString()] = s.count; });

        const result = users.map(u => ({
            ...u,
            serverCount: countMap[u._id.toString()] || 0,
        }));
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update user plan / trial / block
router.put('/users/:id', auth, adminOnly, async (req, res) => {
    try {
        const { plan, planEndsAt, trialEndsAt, isBlocked, extendTrial } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (plan !== undefined) user.plan = plan;
        if (planEndsAt !== undefined) user.planEndsAt = new Date(planEndsAt);
        if (trialEndsAt !== undefined) user.trialEndsAt = new Date(trialEndsAt);
        if (isBlocked !== undefined) user.isBlocked = isBlocked;
        if (req.body.trialVerified !== undefined) user.trialVerified = req.body.trialVerified;
        if (extendTrial) {
            // Reset trial to 5 days from now
            user.plan = 'free_trial';
            user.trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
        }

        // Skip password hash re-run
        user.$__.saveOptions = { validateModifiedOnly: true };
        await user.save();

        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete user + their servers
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
    try {
        await Server.deleteMany({ userId: req.params.id });
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// All servers (admin view)
router.get('/servers', auth, adminOnly, async (req, res) => {
    try {
        const servers = await Server.find().sort('-createdAt');
        res.json(servers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get app settings
router.get('/settings', auth, adminOnly, async (req, res) => {
    try {
        const s = await Settings.get();
        res.json(s);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update app settings (trial days, plan prices/sites, upiId, verificationFee)
router.put('/settings', auth, adminOnly, async (req, res) => {
    try {
        const s = await Settings.update(req.body);
        res.json(s);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── Payment requests ────────────────────────────────────────────────────────

// All payment requests
router.get('/payments', auth, adminOnly, async (req, res) => {
    try {
        const requests = await PaymentRequest.find().sort('-createdAt');
        res.json(requests);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete a payment record
router.delete('/payments/:id', auth, adminOnly, async (req, res) => {
    try {
        const pr = await PaymentRequest.findByIdAndDelete(req.params.id);
        if (!pr) return res.status(404).json({ error: 'Record not found' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Approve a payment — activate plan/trial on user
router.put('/payments/:id/approve', auth, adminOnly, async (req, res) => {
    try {
        const pr = await PaymentRequest.findById(req.params.id);
        if (!pr) return res.status(404).json({ error: 'Not found' });
        if (pr.status !== 'pending') return res.status(400).json({ error: 'Already reviewed' });

        const endsAt = req.body.planEndsAt ? new Date(req.body.planEndsAt) : (() => {
            const d = new Date(); d.setMonth(d.getMonth() + 1); return d;
        })();

        pr.status    = 'approved';
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
});

// Reject a payment
router.put('/payments/:id/reject', auth, adminOnly, async (req, res) => {
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
});

// Clear SSL/Domain Redis cache
router.post('/clear-cache', auth, adminOnly, async (req, res) => {
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
});

module.exports = router;
