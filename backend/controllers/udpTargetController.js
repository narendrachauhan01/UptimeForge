const UdpTarget = require('../models/UdpTarget');
const Settings  = require('../models/Settings');

function userFilter(req) {
    if (req.isAdmin) return {};
    return { userId: req.userId };
}

// GET /api/udp-targets
exports.getTargets = async (req, res) => {
    try {
        const targets = await UdpTarget.find(userFilter(req)).sort('-createdAt');
        res.json(targets);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/udp-targets
exports.createTarget = async (req, res) => {
    try {
        const { name, host, port, notifyRecipients } = req.body;
        if (!name?.trim() || !host?.trim() || !port) return res.status(400).json({ error: 'Name, host, and port are required' });
        const data = { name: name.trim(), host: host.trim(), port: Number(port), notifyRecipients };
        if (!req.isAdmin) {
            data.userId = req.userId;
            // Reuses the same plan-based ping limit as Port/Ping/DNS Monitoring
            const settings = await Settings.get();
            const user = req.user;
            let limit;
            if (user.plan === 'free_trial') {
                limit = settings.freeTrialPingLimit ?? 2;
            } else {
                limit = settings.plans?.[user.plan]?.pingLimit ?? (user.plan === 'bronze' ? 5 : user.plan === 'silver' ? 15 : 30);
            }
            const existing = await UdpTarget.countDocuments({ userId: req.userId });
            if (existing >= limit) {
                return res.status(403).json({ error: `UDP target limit reached (${limit}). Upgrade your plan to add more.` });
            }
        }
        const t = await UdpTarget.create(data);
        res.json(t);
    } catch (e) { res.status(400).json({ error: e.message }); }
};

// PUT /api/udp-targets/:id
exports.updateTarget = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const t = await UdpTarget.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
        if (!t) return res.status(404).json({ error: 'Not found' });
        res.json(t);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/udp-targets/:id
exports.deleteTarget = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const t = await UdpTarget.findOneAndDelete(filter);
        if (!t) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
