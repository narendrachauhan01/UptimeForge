const StatusPage = require('../models/StatusPage');
const Server     = require('../models/Server');
const Alert      = require('../models/Alert');
const User       = require('../models/User');

// GET /api/status-pages  — list all pages (admin)
exports.list = async (req, res) => {
    try {
        const pages = await StatusPage.find().populate('userId', 'name email').lean();
        res.json(pages);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/status-pages
exports.create = async (req, res) => {
    try {
        const { userId, slug, title, description, monitors, isPublic } = req.body;
        const exists = await StatusPage.findOne({ slug });
        if (exists) return res.status(400).json({ error: 'This URL slug is already taken.' });
        const page = await StatusPage.create({ userId, slug, title, description, monitors: monitors || [], isPublic: isPublic !== false });
        res.json(page);
    } catch (e) {
        if (e.code === 11000) return res.status(400).json({ error: 'Slug already taken.' });
        res.status(500).json({ error: e.message });
    }
};

// PUT /api/status-pages/:id
exports.update = async (req, res) => {
    try {
        const { slug, title, description, monitors, isPublic } = req.body;
        if (slug) {
            const exists = await StatusPage.findOne({ slug, _id: { $ne: req.params.id } });
            if (exists) return res.status(400).json({ error: 'This URL slug is already taken.' });
        }
        const page = await StatusPage.findByIdAndUpdate(req.params.id, { slug, title, description, monitors, isPublic }, { new: true });
        if (!page) return res.status(404).json({ error: 'Not found' });
        res.json(page);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/status-pages/:id
exports.remove = async (req, res) => {
    try {
        await StatusPage.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/status-pages/users — get all users for dropdown
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({}, 'name email _id').lean();
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/status-pages/servers/:userId — get servers for a user
exports.getUserServers = async (req, res) => {
    try {
        const servers = await Server.find({ userId: req.params.userId }, 'name url status _id').lean();
        res.json(servers);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/public/status/:slug — NO AUTH, public view
exports.publicView = async (req, res) => {
    try {
        const page = await StatusPage.findOne({ slug: req.params.slug, isPublic: true }).lean();
        if (!page) return res.status(404).json({ error: 'Status page not found' });

        const servers = await Server.find({ _id: { $in: page.monitors } }).lean();

        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const incidents = await Alert.find({
            server: { $in: servers.map(s => s._id) },
            type: 'down',
            createdAt: { $gte: cutoff },
        }).sort('-createdAt').limit(20).lean();

        const monitorList = servers.map(s => {
            const hist = (s.history || []).slice(-90);
            return {
                _id: s._id,
                name: s.name,
                url: s.url,
                status: s.status || 'up',
                uptime: s.uptime ?? 100,
                responseTime: s.responseTime || null,
                sslDaysLeft: s.sslDaysLeft ?? null,
                uptimeBars: hist.map(h => h.status === 'up' ? 1 : 0),
            };
        });

        const downCount = monitorList.filter(m => m.status === 'down').length;
        const overallStatus = downCount === 0 ? 'operational' : downCount === monitorList.length ? 'outage' : 'degraded';

        res.json({
            title: page.title,
            description: page.description,
            overallStatus,
            monitors: monitorList,
            pingTargets: [],
            incidents: incidents.map(a => ({
                name: a.serverName,
                url: a.serverUrl,
                at: new Date(a.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
            })),
            lastUpdated: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
