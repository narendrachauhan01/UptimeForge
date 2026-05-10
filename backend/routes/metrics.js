const router = require('express').Router();
const ServerMetric = require('../models/ServerMetric');

// API Key middleware
function authAgent(req, res, next) {
    const key = req.headers['x-agent-key'];
    if (!key || key !== process.env.AGENT_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized — invalid agent key' });
    }
    next();
}

// POST /api/metrics — agent sends metrics
router.post('/', authAgent, async (req, res) => {
    try {
        const { serverId, serverName, hostname, platform, cpu,
                ramUsed, ramTotal, diskUsed, diskTotal,
                swapUsed, swapTotal, load1, load5, load15,
                uptime, uptimeStr, users, cpuCores, cpuModel, cpuArch, cpuTemp,
                localIp, publicIp, networkRoutes, lastSsh } = req.body;
        if (!serverId || !serverName) return res.status(400).json({ error: 'serverId and serverName required' });

        await ServerMetric.create({
            serverId, serverName, hostname, platform, cpu, cpuTemp,
            ramUsed, ramTotal, diskUsed, diskTotal,
            swapUsed, swapTotal, load1, load5, load15,
            uptime, uptimeStr, users, cpuCores, cpuModel, cpuArch,
            localIp, publicIp, networkRoutes, lastSsh,
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/metrics/latest — latest metrics for all servers
router.get('/latest', async (req, res) => {
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
});

// GET /api/metrics/:serverId/history — last 1 hour history
router.get('/:serverId/history', async (req, res) => {
    try {
        const since = new Date(Date.now() - 60 * 60 * 1000); // last 1 hour
        const metrics = await ServerMetric.find({
            serverId: req.params.serverId,
            timestamp: { $gte: since },
        }).sort({ timestamp: 1 }).limit(120);
        res.json(metrics);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
