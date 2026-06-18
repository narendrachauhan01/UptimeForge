const DnsTarget = require('../models/DnsTarget');
const Settings   = require('../models/Settings');

const VALID_TYPES = ['A','AAAA','CNAME','MX','TXT','NS'];

function userFilter(req) {
    if (req.isAdmin) return {};
    return { userId: req.userId };
}

// GET /api/dns-targets
exports.getTargets = async (req, res) => {
    try {
        const targets = await DnsTarget.find(userFilter(req)).sort('-createdAt');
        res.json(targets);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/dns-targets
exports.createTarget = async (req, res) => {
    try {
        const { name, hostname, recordType, expectedValue, dnsServer, notifyRecipients } = req.body;
        if (!name?.trim() || !hostname?.trim()) return res.status(400).json({ error: 'Name and hostname are required' });
        const data = {
            name: name.trim(),
            hostname: hostname.trim(),
            recordType: VALID_TYPES.includes(recordType) ? recordType : 'A',
            expectedValue: (expectedValue || '').trim(),
            dnsServer: (dnsServer || '').trim(),
            notifyRecipients,
        };
        if (!req.isAdmin) {
            data.userId = req.userId;
            // Reuses the same plan-based ping limit as Port/Ping Monitoring
            const settings = await Settings.get();
            const user = req.user;
            let limit;
            if (user.plan === 'free_trial') {
                limit = settings.freeTrialPingLimit ?? 2;
            } else {
                limit = settings.plans?.[user.plan]?.pingLimit ?? (user.plan === 'bronze' ? 5 : user.plan === 'silver' ? 15 : 30);
            }
            const existing = await DnsTarget.countDocuments({ userId: req.userId });
            if (existing >= limit) {
                return res.status(403).json({ error: `DNS target limit reached (${limit}). Upgrade your plan to add more.` });
            }
        }
        const t = await DnsTarget.create(data);
        res.json(t);
    } catch (e) { res.status(400).json({ error: e.message }); }
};

// PUT /api/dns-targets/:id
exports.updateTarget = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const update = { ...req.body };
        if (update.recordType && !VALID_TYPES.includes(update.recordType)) delete update.recordType;
        const t = await DnsTarget.findOneAndUpdate(filter, update, { returnDocument: 'after' });
        if (!t) return res.status(404).json({ error: 'Not found' });
        res.json(t);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/dns-targets/:id
exports.deleteTarget = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const t = await DnsTarget.findOneAndDelete(filter);
        if (!t) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
