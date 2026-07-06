const ServerMetric = require('../models/ServerMetric');
const { ServerMetricHistory } = require('../models/ServerMetric');
const Settings = require('../models/Settings');

// POST /api/metrics  — called by agent (per-user agentKey auth, done in route middleware)
exports.ingestMetrics = async (req, res) => {
    try {
        const user = req.agentUser;
        const settings = await Settings.get();

        // Check infraMonitor access for this plan
        const accessKey = user.plan === 'free_trial' ? 'freeTrialAccess' : `${user.plan}Access`;
        const hasAccess = settings[accessKey]?.infraMonitor;
        if (!hasAccess) return res.status(403).json({ error: 'Infra Monitor not available on your plan' });

        const {
            serverId, serverName, hostname, platform, cpu,
            ramUsed, ramTotal, diskUsed, diskTotal,
            swapUsed, swapTotal, load1, load5, load15,
            uptime, uptimeStr, users, cpuCores, cpuModel, cpuArch, cpuTemp,
            localIp, publicIp, networkRoutes, activeSessions, lastSsh,
        } = req.body;
        if (!serverId || !serverName) return res.status(400).json({ error: 'serverId and serverName required' });

        // Check server limit for this plan
        const limit = settings.infraServers?.[user.plan] ?? 0;
        const existing = await ServerMetric.distinct('serverId', { userId: user._id });
        if (!existing.includes(serverId) && existing.length >= limit) {
            return res.status(403).json({ error: `Server limit reached (${limit}). Upgrade your plan.` });
        }

        // Upsert latest snapshot — always one doc per (userId, serverId)
        await ServerMetric.findOneAndUpdate(
            { userId: user._id, serverId },
            {
                userId: user._id, serverId, serverName, hostname, platform,
                cpu, cpuTemp, ramUsed, ramTotal, diskUsed, diskTotal,
                swapUsed, swapTotal, load1, load5, load15,
                uptime, uptimeStr, users, cpuCores, cpuModel, cpuArch,
                localIp, publicIp, networkRoutes, activeSessions, lastSsh,
                timestamp: new Date(),
            },
            { upsert: true }
        );

        // Insert history point (auto-deleted after 2 hours by TTL)
        await ServerMetricHistory.create({
            userId: user._id, serverId, cpu, ramUsed, ramTotal, diskUsed, diskTotal,
            timestamp: new Date(),
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/metrics/latest  — logged-in user sees only their servers
exports.getLatest = async (req, res) => {
    try {
        const userId = req.isAdmin ? undefined : req.user._id;
        const query = userId ? { userId } : {};
        const servers = await ServerMetric.find(query).lean();
        res.json(servers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/metrics/:serverId/history
exports.getHistory = async (req, res) => {
    try {
        const userId = req.isAdmin ? undefined : req.user._id;
        const query = { serverId: req.params.serverId };
        if (userId) query.userId = userId;
        const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const metrics = await ServerMetricHistory.find({ ...query, timestamp: { $gte: since } })
            .sort({ timestamp: 1 }).limit(240).lean();
        res.json(metrics);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /api/metrics/:serverId  — remove server + all its data
exports.deleteServer = async (req, res) => {
    try {
        const userId = req.user._id;
        const { serverId } = req.params;
        await ServerMetric.deleteOne({ userId, serverId });
        await ServerMetricHistory.deleteMany({ userId, serverId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Called when a user account is deleted — clean up all their metrics
exports.deleteAllForUser = async (userId) => {
    await ServerMetric.deleteMany({ userId });
    await ServerMetricHistory.deleteMany({ userId });
};
