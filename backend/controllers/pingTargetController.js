const PingTarget = require('../models/PingTarget');

function userFilter(req) {
    if (req.isAdmin) return {};
    return { userId: req.userId };
}

// GET /api/ping-targets
exports.getTargets = async (req, res) => {
    try {
        const targets = await PingTarget.find(userFilter(req)).sort('-createdAt');
        res.json(targets);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/ping-targets
exports.createTarget = async (req, res) => {
    try {
        const data = { ...req.body };
        if (!req.isAdmin) data.userId = req.userId;
        const t = await PingTarget.create(data);
        res.json(t);
    } catch (e) { res.status(400).json({ error: e.message }); }
};

// PUT /api/ping-targets/:id
exports.updateTarget = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const t = await PingTarget.findOneAndUpdate(filter, req.body, { new: true });
        if (!t) return res.status(404).json({ error: 'Not found' });
        res.json(t);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/ping-targets/:id
exports.deleteTarget = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const t = await PingTarget.findOneAndDelete(filter);
        if (!t) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
