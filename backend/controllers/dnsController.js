const dns = require('dns');

const VALID_TYPES = ['A','AAAA','CNAME','MX','TXT','NS'];
const HOST_RE = /^[a-zA-Z0-9.\-]+$/;

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('ETIMEDOUT')), ms)),
    ]);
}

async function resolveDns(hostname, recordType, dnsServer) {
    const start = Date.now();
    try {
        let resolver = dns.promises;
        if (dnsServer) {
            const r = new dns.promises.Resolver();
            r.setServers([dnsServer]);
            resolver = r;
        }
        let values;
        switch (recordType) {
            case 'AAAA':  values = await withTimeout(resolver.resolve6(hostname), 5000); break;
            case 'CNAME': values = await withTimeout(resolver.resolveCname(hostname), 5000); break;
            case 'MX':    values = (await withTimeout(resolver.resolveMx(hostname), 5000)).map(r => r.exchange); break;
            case 'TXT':   values = (await withTimeout(resolver.resolveTxt(hostname), 5000)).map(arr => arr.join('')); break;
            case 'NS':    values = await withTimeout(resolver.resolveNs(hostname), 5000); break;
            default:      values = await withTimeout(resolver.resolve4(hostname), 5000);
        }
        return { resolved: true, values, ms: Date.now() - start };
    } catch (e) {
        return { resolved: false, values: [], ms: Date.now() - start, error: e.code || e.message };
    }
}

// POST /api/dns/resolve — live DNS test (used by DNS Monitoring detail page)
exports.resolve = async (req, res) => {
    const { hostname, recordType, dnsServer } = req.body;
    if (!hostname || !HOST_RE.test(hostname)) return res.status(400).json({ error: 'Valid hostname required' });
    if (dnsServer && !/^[a-zA-Z0-9.:]+$/.test(dnsServer)) return res.status(400).json({ error: 'Invalid DNS server' });
    try {
        const result = await resolveDns(hostname, VALID_TYPES.includes(recordType) ? recordType : 'A', dnsServer);
        res.json({ hostname, recordType: recordType || 'A', ...result, time: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports.resolveDns = resolveDns;
