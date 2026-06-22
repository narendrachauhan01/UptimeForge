const { checkApiTarget } = require('../services/apiAssertions');

// POST /api/api-monitor/test — live request + assertion test (used by Add/Edit modal and detail page)
exports.test = async (req, res) => {
    const { url, httpMethod, requestHeaders, requestBody, assertions, assertionLogic,
            timeout, ipVersion, followRedirects, upStatusCodes } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    try {
        const result = await checkApiTarget({
            url, httpMethod, requestHeaders, requestBody, assertions, assertionLogic,
            timeout, ipVersion, followRedirects, upStatusCodes,
        });
        res.json({ ...result, time: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
