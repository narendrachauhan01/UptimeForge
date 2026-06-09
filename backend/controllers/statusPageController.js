const StatusPage = require('../models/StatusPage');
const Server     = require('../models/Server');
const PingTarget = require('../models/PingTarget');
const Alert      = require('../models/Alert');

// GET /api/status-pages  — list user's pages
exports.list = async (req, res) => {
    try {
        const pages = await StatusPage.find({ userId: req.userId }).lean();
        res.json(pages);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/status-pages
exports.create = async (req, res) => {
    try {
        const { slug, title, description, monitors, pingTargets, isPublic } = req.body;
        const exists = await StatusPage.findOne({ slug });
        if (exists) return res.status(400).json({ error: 'This URL slug is already taken. Try another.' });
        const page = await StatusPage.create({ userId: req.userId, slug, title, description, monitors: monitors || [], pingTargets: pingTargets || [], isPublic: isPublic !== false });
        res.json(page);
    } catch (e) {
        if (e.code === 11000) return res.status(400).json({ error: 'Slug already taken.' });
        res.status(500).json({ error: e.message });
    }
};

// PUT /api/status-pages/:id
exports.update = async (req, res) => {
    try {
        const { slug, title, description, monitors, pingTargets, isPublic } = req.body;
        if (slug) {
            const exists = await StatusPage.findOne({ slug, _id: { $ne: req.params.id } });
            if (exists) return res.status(400).json({ error: 'This URL slug is already taken.' });
        }
        const page = await StatusPage.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { slug, title, description, monitors, pingTargets, isPublic },
            { new: true }
        );
        if (!page) return res.status(404).json({ error: 'Not found' });
        res.json(page);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/status-pages/:id
exports.remove = async (req, res) => {
    try {
        await StatusPage.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/public/status/:slug  — NO AUTH
exports.publicView = async (req, res) => {
    try {
        const page = await StatusPage.findOne({ slug: req.params.slug, isPublic: true }).lean();
        if (!page) return res.status(404).json({ error: 'Status page not found' });

        const [servers, pings] = await Promise.all([
            Server.find({ _id: { $in: page.monitors } }).lean(),
            PingTarget.find({ _id: { $in: page.pingTargets } }).lean(),
        ]);

        // Recent incidents (last 30 days, max 20)
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const allServerIds = servers.map(s => s._id);
        const incidents = await Alert.find({
            $or: [
                { server: { $in: allServerIds }, type: 'down' },
                { userId: page.userId, source: 'ping', type: 'down' },
            ],
            createdAt: { $gte: cutoff },
        }).sort('-createdAt').limit(20).lean();

        const monitorList = servers.map(s => {
            const hist = (s.history || []).slice(-90);
            const uptimeBars = hist.map(h => h.status === 'up' ? 1 : 0);
            return {
                _id: s._id,
                name: s.name,
                url: s.url,
                status: s.status || 'up',
                uptime: s.uptime ?? 100,
                responseTime: s.responseTime || null,
                sslDaysLeft: s.sslDaysLeft ?? null,
                uptimeBars,
            };
        });

        const pingList = pings.map(p => {
            const hist = (p.history || []).slice(-90);
            const uptimeBars = hist.map(h => h.status === 'up' ? 1 : 0);
            return {
                _id: p._id,
                name: p.name,
                host: `${p.host}${p.port ? ':' + p.port : ''}`,
                status: p.status || 'up',
                uptime: p.uptime ?? 100,
                responseTime: p.responseTime || null,
                uptimeBars,
            };
        });

        const allDown = [...monitorList, ...pingList].some(m => m.status === 'down');
        const someDown = [...monitorList, ...pingList].filter(m => m.status === 'down').length;
        const overallStatus = allDown
            ? (someDown === monitorList.length + pingList.length ? 'outage' : 'degraded')
            : 'operational';

        res.json({
            title: page.title,
            description: page.description,
            overallStatus,
            monitors: monitorList,
            pingTargets: pingList,
            incidents: incidents.map(a => ({
                name: a.serverName,
                url: a.serverUrl,
                at: new Date(a.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
                source: a.source || 'http',
            })),
            lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
