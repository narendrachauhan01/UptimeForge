const Alert  = require('../models/Alert');
const Server = require('../models/Server');

// POST /api/alerts/server/:serverId/end — manually resolve/end an incident
exports.endIncident = async (req, res) => {
    try {
        const server = await Server.findById(req.params.serverId);
        if (!server) return res.status(404).json({ error: 'Server not found' });
        if (!req.isAdmin && String(server.userId) !== String(req.userId))
            return res.status(403).json({ error: 'Forbidden' });

        // Reset downAlertSent so next detection can fire fresh alerts
        await Server.findByIdAndUpdate(server._id, { downAlertSent: false });

        // Create a manual "recovered" alert to mark the incident as ended
        await Alert.create({
            server:     server._id,
            userId:     req.userId,
            serverName: server.name,
            serverUrl:  server.url,
            type:       'recovered',
            message:    'Incident manually resolved',
            sentTo:     [],
        });

        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/alerts/server/:serverId — current incident for a server
exports.getServerIncident = async (req, res) => {
    try {
        const server = await Server.findById(req.params.serverId);
        if (!server) return res.status(404).json({ error: 'Server not found' });
        if (!req.isAdmin && String(server.userId) !== String(req.userId))
            return res.status(403).json({ error: 'Forbidden' });

        // Last 90 days of alerts for this server, newest first
        const alerts = await Alert.find({
            server: server._id,
            createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        }).sort('-createdAt').limit(100);

        // Find the most recent "down" alert — that starts the current incident
        const lastDown = alerts.find(a => a.type === 'down');
        if (!lastDown) return res.json({ server, incident: null, activity: [] });

        // Find the first "recovered" alert AFTER the down started
        const recovery = alerts.find(a => a.type === 'recovered' && a.createdAt > lastDown.createdAt);

        // Activity = all alerts from the down event up to recovery (or now)
        const cutoff = recovery ? recovery.createdAt : new Date();
        const activity = alerts.filter(a => a.createdAt >= lastDown.createdAt && a.createdAt <= cutoff);

        const durationMs = (recovery ? recovery.createdAt : new Date()) - new Date(lastDown.createdAt);

        res.json({
            server: { _id: server._id, name: server.name, url: server.url, status: server.status },
            incident: {
                status: recovery ? 'resolved' : 'ongoing',
                startedAt: lastDown.createdAt,
                resolvedAt: recovery?.createdAt || null,
                durationMs,
                rootCause: lastDown.message || 'Site unreachable',
            },
            activity,
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const PAGE_SIZE = 20;

// GET /api/alerts
exports.getAlerts = async (req, res) => {
    try {
        // Base filter — scope to this user's servers + ping alerts
        let baseFilter = {};
        if (!req.isAdmin) {
            const serverIds = (await Server.find({ userId: req.userId }, '_id')).map(s => s._id);
            baseFilter = { $or: [
                { server: { $in: serverIds } },
                { userId: req.userId, source: 'ping' },
            ]};
        }
        // Always last 30 days
        baseFilter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };

        // Query filter — adds type / month / search on top of base
        const queryFilter = { ...baseFilter };

        if (req.query.type && req.query.type !== 'all') {
            queryFilter.type = req.query.type;
        }

        if (req.query.month && req.query.month !== 'all') {
            const [year, mon] = req.query.month.split('-').map(Number);
            queryFilter.createdAt = { $gte: new Date(year, mon - 1, 1), $lt: new Date(year, mon, 1) };
        }

        if (req.query.search) {
            const q = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            queryFilter.$and = [{ $or: [{ serverName: q }, { serverUrl: q }] }];
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const effectiveLimit = req.query.limit ? Math.min(500, Math.max(1, parseInt(req.query.limit) || PAGE_SIZE)) : PAGE_SIZE;
        const skip = req.query.limit ? 0 : (page - 1) * PAGE_SIZE;

        const [alerts, total, downCount, recoveredCount, totalCount, monthAgg] = await Promise.all([
            Alert.find(queryFilter).sort('-createdAt').skip(skip).limit(effectiveLimit),
            Alert.countDocuments(queryFilter),
            Alert.countDocuments({ ...baseFilter, type: 'down' }),
            Alert.countDocuments({ ...baseFilter, type: 'recovered' }),
            Alert.countDocuments(baseFilter),
            Alert.aggregate([
                { $match: baseFilter },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } } } },
                { $sort: { _id: -1 } },
            ]),
        ]);

        res.json({
            alerts,
            total,
            page,
            pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            summary: {
                total: totalCount,
                down: downCount,
                recovered: recoveredCount,
                months: monthAgg.map(m => m._id),
            },
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
