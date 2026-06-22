const ApiTarget = require('../models/ApiTarget');
const Settings  = require('../models/Settings');

const VALID_METHODS    = ['GET','POST','PUT','PATCH','DELETE','HEAD'];
const VALID_COMPARISON = ['equals','not_equals','contains','greater_than','less_than','exists','not_exists'];

function sanitizeAssertions(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
        .filter(a => a && a.property)
        .map(a => ({
            property:   String(a.property).trim(),
            comparison: VALID_COMPARISON.includes(a.comparison) ? a.comparison : 'equals',
            target:     a.target !== undefined ? String(a.target) : '',
        }));
}

function buildData(body) {
    const { name, url, httpMethod, requestHeaders, requestBody, assertions, assertionLogic,
            timeout, ipVersion, followRedirects, upStatusCodes, slowResponseAlert, slowResponseThreshold,
            notifyRecipients } = body;
    return {
        name: (name || '').trim(),
        url: (url || '').trim(),
        httpMethod: VALID_METHODS.includes(httpMethod) ? httpMethod : 'GET',
        requestHeaders: Array.isArray(requestHeaders) ? requestHeaders.filter(h => h && h.key) : [],
        requestBody: requestBody || '',
        assertions: sanitizeAssertions(assertions),
        assertionLogic: assertionLogic === 'OR' ? 'OR' : 'AND',
        timeout: timeout ? Number(timeout) : 30,
        ipVersion: ['ipv4_priority','ipv6_priority','ipv4_only','ipv6_only'].includes(ipVersion) ? ipVersion : 'ipv4_priority',
        followRedirects: followRedirects !== false,
        upStatusCodes: Array.isArray(upStatusCodes) && upStatusCodes.length ? upStatusCodes : ['2xx','3xx'],
        slowResponseAlert: !!slowResponseAlert,
        slowResponseThreshold: slowResponseThreshold ? Number(slowResponseThreshold) : null,
        notifyRecipients,
    };
}

function userFilter(req) {
    if (req.isAdmin) return {};
    return { userId: req.userId };
}

// GET /api/api-targets
exports.getTargets = async (req, res) => {
    try {
        const targets = await ApiTarget.find(userFilter(req)).sort('-createdAt');
        res.json(targets);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/api-targets
exports.createTarget = async (req, res) => {
    try {
        const data = buildData(req.body);
        if (!data.name || !data.url) return res.status(400).json({ error: 'Name and URL are required' });
        if (!req.isAdmin) {
            data.userId = req.userId;
            // Reuses the same plan-based ping limit as other monitoring features
            const settings = await Settings.get();
            const user = req.user;
            let limit;
            if (user.plan === 'free_trial') {
                limit = settings.freeTrialPingLimit ?? 2;
            } else {
                limit = settings.plans?.[user.plan]?.pingLimit ?? (user.plan === 'bronze' ? 5 : user.plan === 'silver' ? 15 : 30);
            }
            const existing = await ApiTarget.countDocuments({ userId: req.userId });
            if (existing >= limit) {
                return res.status(403).json({ error: `API target limit reached (${limit}). Upgrade your plan to add more.` });
            }
        }
        const t = await ApiTarget.create(data);
        res.json(t);
    } catch (e) { res.status(400).json({ error: e.message }); }
};

// PUT /api/api-targets/:id
exports.updateTarget = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        // Allow partial updates (e.g. just { active } for pause/resume) without re-validating everything
        const update = req.body.name !== undefined || req.body.url !== undefined || req.body.assertions !== undefined
            ? buildData({ ...(await ApiTarget.findOne(filter))?.toObject(), ...req.body })
            : req.body;
        const t = await ApiTarget.findOneAndUpdate(filter, update, { returnDocument: 'after' });
        if (!t) return res.status(404).json({ error: 'Not found' });
        res.json(t);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/api-targets/:id
exports.deleteTarget = async (req, res) => {
    try {
        const filter = { _id: req.params.id, ...userFilter(req) };
        const t = await ApiTarget.findOneAndDelete(filter);
        if (!t) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
