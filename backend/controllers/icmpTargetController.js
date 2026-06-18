const IcmpTarget = require('../models/IcmpTarget');
const Settings    = require('../models/Settings');

function userFilter(req) {
    if (req.isAdmin) return {};
    return { userId: req.userId };
}

// GET /api/icmp-targets
exports.getTargets = async (req, res) => {
    try {
        const targets = await IcmpTarget.find(userFilter(req)).sort('-createdAt');
        res.json(targets);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/icmp-targets
exports.createTarget = async (req, res) => {
    try {
        const data = { name: req.body.name, host: req.body.host, notifyRecipients: req.body.notifyRecipients };
        if (!req.isAdmin) {
            data.userId = req.userId;
            // Check plan ping limit (shares the same plan limit as Port Monitoring)
            const settings = await Settings.get();
            const user = req.user;
            let pingLimit;
            if (user.plan === 'free_trial') {
                pingLimit = settings.freeTrialPingLimit ?? 2;
            } else {
                pingLimit = settings.plans?.[user.plan]?.pingLimit ?? (user.plan === 'bronze' ? 5 : user.plan === 'silver' ? 15 : 30);
            }
            const existing = await IcmpTarget.countDocuments({ userId: req.userId });
            if (existing >= pingLimit) {
                return res.status(403).json({ error: `Ping target limit reached (${pingLimit}). Upgrade your plan to add more.` });
            }
        }
        const t = await IcmpTarget.create(data);
        res.json(t);
    } catch (e) { res.status(400).json({ error: e.message }); }
};

// PUT /api/icmp-targets/:id
exports.updateTarget = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const t = await IcmpTarget.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
        if (!t) return res.status(404).json({ error: 'Not found' });
        res.json(t);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/icmp-targets/:id
exports.deleteTarget = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const t = await IcmpTarget.findOneAndDelete(filter);
        if (!t) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
