const Alert = require('../models/Alert');
const Server = require('../models/Server');

// GET /api/alerts
exports.getAlerts = async (req, res) => {
    try {
        let filter = {};
        if (!req.isAdmin) {
            const userServers = await Server.find({ userId: req.userId }, '_id');
            const serverIds = userServers.map(s => s._id);
            // Include both site alerts (by server) and ping alerts (by userId)
            filter = { $or: [
                { server: { $in: serverIds } },
                { userId: req.userId, source: 'ping' },
            ]};
        }
        if (req.query.server) filter.server = req.query.server;
        const alerts = await Alert.find(filter).sort('-createdAt').limit(50);
        res.json(alerts);
    } catch (e) { res.status(500).json({ error: e.message }); }
};
