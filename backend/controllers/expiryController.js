const Server = require('../models/Server');
const { checkSSL, checkDomain, extractHostname, extractRootDomain } = require('../services/expiry');

// GET /api/expiry/:id
exports.getExpiry = async (req, res) => {
    try {
        const filter = { _id: req.params.id };
        if (!req.isAdmin) filter.userId = req.userId;
        const server = await Server.findOne(filter);
        if (!server) return res.status(404).json({ error: 'Server not found' });

        const hostname = extractHostname(server.url);
        if (!hostname) return res.status(400).json({ error: 'Invalid URL' });

        const rootDomain = extractRootDomain(hostname);
        const [ssl, domain] = await Promise.all([checkSSL(hostname), checkDomain(rootDomain)]);

        if (ssl) {
            server.sslExpiry = ssl.expiry;
            server.sslDaysLeft = ssl.daysLeft;
        }
        if (domain) {
            server.domainExpiry = domain.expiry;
        }
        await server.save();

        res.json({ ssl, domain, hostname, rootDomain });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
