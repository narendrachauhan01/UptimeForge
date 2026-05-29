const Recipient = require('../models/Recipient');
const Settings = require('../models/Settings');

function userFilter(req) {
    if (req.isAdmin) return {};
    return { userId: req.userId };
}

// GET /api/recipients
exports.getRecipients = async (req, res) => {
    try {
        const recipients = await Recipient.find(userFilter(req)).sort('-createdAt').populate('servers', 'name status');
        if (!req.isAdmin) {
            const settings = await Settings.get();
            const plan = req.user.plan || 'free_trial';
            const limit = plan === 'free_trial'
                ? (settings.freeTrialRecipientLimit || 2)
                : (settings.plans?.[plan]?.recipientLimit || 10);
            return res.json({ recipients, limit, count: recipients.length, plan });
        }
        res.json({ recipients, limit: null, count: recipients.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/recipients
exports.createRecipient = async (req, res) => {
    try {
        const data = { ...req.body };
        if (!req.isAdmin) {
            data.userId = req.userId;
            const settings = await Settings.get();
            const plan = req.user.plan || 'free_trial';
            const limit = plan === 'free_trial'
                ? (settings.freeTrialRecipientLimit || 2)
                : (settings.plans?.[plan]?.recipientLimit || 10);
            const count = await Recipient.countDocuments({ userId: req.userId });
            if (count >= limit) {
                return res.status(403).json({
                    error: `Recipient limit reached (${limit} on ${plan} plan). Upgrade to add more.`,
                    limitReached: true, limit, plan,
                });
            }
        }
        const r = await Recipient.create(data);
        res.json(r);
    } catch (e) { res.status(400).json({ error: e.message }); }
};

// PUT /api/recipients/:id
exports.updateRecipient = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const r = await Recipient.findOneAndUpdate(filter, req.body, { new: true });
        if (!r) return res.status(404).json({ error: 'Not found' });
        res.json(r);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/recipients/:id
exports.deleteRecipient = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const r = await Recipient.findOneAndDelete(filter);
        if (!r) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
