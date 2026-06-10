const StatusPage = require('../models/StatusPage');
const Server     = require('../models/Server');

// GET /api/status-pages  — list all pages (admin)
exports.list = async (req, res) => {
    try {
        const pages = await StatusPage.find().lean();
        res.json(pages);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/status-pages
exports.create = async (req, res) => {
    try {
        const { slug, title, description, monitors, isPublic } = req.body;
        const exists = await StatusPage.findOne({ slug });
        if (exists) return res.status(400).json({ error: 'This URL slug is already taken.' });
        const page = await StatusPage.create({ slug, title, description, monitors: monitors || [], isPublic: isPublic !== false });
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

// GET /api/status-pages/all-servers — all servers across all users (admin)
exports.getAllServers = async (req, res) => {
    try {
        const servers = await Server.find({}, 'name url status userId _id').lean();
        res.json(servers);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/status-pages/:id/incidents
exports.createIncident = async (req, res) => {
    try {
        const { title, body, status } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required.' });
        const page = await StatusPage.findById(req.params.id);
        if (!page) return res.status(404).json({ error: 'Not found' });
        page.incidents.push({ title, body: body || '', status: status || 'investigating' });
        await page.save();
        res.json(page);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// PUT /api/status-pages/:id/incidents/:incId
exports.updateIncident = async (req, res) => {
    try {
        const { title, body, status } = req.body;
        const page = await StatusPage.findById(req.params.id);
        if (!page) return res.status(404).json({ error: 'Not found' });
        const inc = page.incidents.id(req.params.incId);
        if (!inc) return res.status(404).json({ error: 'Incident not found' });
        if (title  !== undefined) inc.title  = title;
        if (body   !== undefined) inc.body   = body;
        if (status !== undefined) inc.status = status;
        await page.save();
        res.json(page);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/status-pages/:id/incidents/:incId
exports.deleteIncident = async (req, res) => {
    try {
        const page = await StatusPage.findById(req.params.id);
        if (!page) return res.status(404).json({ error: 'Not found' });
        page.incidents.pull({ _id: req.params.incId });
        await page.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/public/statuses — NO AUTH, index of all public pages
exports.publicIndex = async (req, res) => {
    try {
        const pages = await StatusPage.find({ isPublic: true }).lean();

        const result = await Promise.all(pages.map(async (page) => {
            const servers = await Server.find({ _id: { $in: page.monitors } }, 'name status uptime').lean();
            const downCount = servers.filter(s => s.status === 'down').length;
            const overallStatus = servers.length === 0 ? 'operational'
                : downCount === 0 ? 'operational'
                : downCount === servers.length ? 'outage'
                : 'degraded';
            return {
                title: page.title,
                slug: page.slug,
                description: page.description,
                overallStatus,
                monitorCount: servers.length,
                updatedAt: page.updatedAt,
            };
        }));

        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/public/status/:slug — NO AUTH, public view
exports.publicView = async (req, res) => {
    try {
        const page = await StatusPage.findOne({ slug: req.params.slug, isPublic: true }).lean();
        if (!page) return res.status(404).json({ error: 'Status page not found' });

        const servers = await Server.find({ _id: { $in: page.monitors } }).lean();

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

        const fmt = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

        const incidents = (page.incidents || [])
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(i => ({
                _id: i._id,
                title: i.title,
                body: i.body,
                status: i.status,
                at: fmt(i.createdAt),
            }));

        res.json({
            title: page.title,
            description: page.description,
            overallStatus,
            monitors: monitorList,
            incidents,
            lastUpdated: fmt(new Date()),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
