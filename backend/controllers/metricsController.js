const ServerMetric = require('../models/ServerMetric');

// POST /api/metrics
exports.ingestMetrics = async (req, res) => {
    try {
        const {
            serverId, serverName, hostname, platform, cpu,
            ramUsed, ramTotal, diskUsed, diskTotal,
            swapUsed, swapTotal, load1, load5, load15,
            uptime, uptimeStr, users, cpuCores, cpuModel, cpuArch, cpuTemp,
            localIp, publicIp, networkRoutes, activeSessions, lastSsh,
        } = req.body;
        if (!serverId || !serverName) return res.status(400).json({ error: 'serverId and serverName required' });

        await ServerMetric.create({
            serverId, serverName, hostname, platform, cpu, cpuTemp,
            ramUsed, ramTotal, diskUsed, diskTotal,
            swapUsed, swapTotal, load1, load5, load15,
            uptime, uptimeStr, users, cpuCores, cpuModel, cpuArch,
            localIp, publicIp, networkRoutes, activeSessions, lastSsh,
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/metrics/latest
exports.getLatest = async (req, res) => {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const servers = await ServerMetric.aggregate([
            { $sort: { timestamp: -1 } },
            { $group: { _id: '$serverId', latest: { $first: '$$ROOT' } } },
            { $replaceRoot: { newRoot: '$latest' } },
        ]);
        res.json(servers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/metrics/:serverId/history
exports.getHistory = async (req, res) => {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const since = new Date(Date.now() - 60 * 60 * 1000);
        const metrics = await ServerMetric.find({
            serverId: req.params.serverId,
            timestamp: { $gte: since },
        }).sort({ timestamp: 1 }).limit(120);
        res.json(metrics);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
