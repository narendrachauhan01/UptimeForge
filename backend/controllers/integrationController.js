const Integration = require('../models/Integration');
const https = require('https');
const http = require('http');

// GET /api/integrations
exports.getIntegrations = async (req, res) => {
    try {
        const list = await Integration.find({ userId: req.userId });
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/integrations/test-webhook
exports.testWebhook = async (req, res) => {
    const { url, body } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    try {
        const parsed = new URL(url);
        const payload = JSON.stringify(body || { text: '🚨 *Test* — integration is working!' });
        const mod = url.startsWith('https') ? https : http;
        await new Promise((resolve, reject) => {
            const r = mod.request({
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
            }, (resp) => {
                let data = '';
                resp.on('data', c => data += c);
                resp.on('end', () => resp.statusCode < 400
                    ? resolve(data)
                    : reject(new Error(`HTTP ${resp.statusCode}: ${data}`)));
            });
            r.on('error', reject);
            r.write(payload);
            r.end();
        });
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
};

// POST /api/integrations/:type
exports.saveIntegration = async (req, res) => {
    try {
        const { type } = req.params;
        const { config, events, active, servers } = req.body;
        const doc = await Integration.findOneAndUpdate(
            { userId: req.userId, type },
            { config, events: events || 'all', servers: servers || [], active: active !== false },
            { upsert: true, new: true }
        );
        res.json(doc);
    } catch (e) { res.status(400).json({ error: e.message }); }
};

// DELETE /api/integrations/:type
exports.deleteIntegration = async (req, res) => {
    try {
        await Integration.deleteOne({ userId: req.userId, type: req.params.type });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
