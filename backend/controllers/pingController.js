const net = require('net');
const dns = require('dns');
const { execFile } = require('child_process');

const HOST_RE = /^[a-zA-Z0-9.\-:]+$/;

function icmpPing(host) {
    return new Promise((resolve) => {
        if (!HOST_RE.test(host)) return resolve({ alive: false, ms: null });
        const isWin = process.platform === 'win32';
        const args = isWin ? ['-n', '1', '-w', '2000', host] : ['-c', '1', '-W', '2', host];
        execFile('ping', args, { timeout: 5000 }, (err, stdout) => {
            if (err) return resolve({ alive: false, ms: null });
            const match = (stdout || '').match(/time[=<]([\d.]+)/i);
            resolve({ alive: true, ms: match ? Math.round(parseFloat(match[1])) : null });
        });
    });
}

function resolveDnsFamily(host, family) {
    return new Promise((resolve) => {
        dns.lookup(host, { family }, (err, address) => {
            if (err) return resolve(null);
            resolve(address);
        });
    });
}

async function resolveByIpVersion(host, ipVersion) {
    if (net.isIP(host)) return { address: host, family: net.isIPv4(host) ? 4 : 6 };
    const order = ipVersion === 'ipv6_only'     ? [6]
                : ipVersion === 'ipv4_only'     ? [4]
                : ipVersion === 'ipv6_priority' ? [6, 4]
                : [4, 6]; // ipv4_priority (default)
    for (const fam of order) {
        const addr = await resolveDnsFamily(host, fam);
        if (addr) return { address: addr, family: fam };
    }
    return null;
}

function tcpPing(address, port = 80, family) {
    return new Promise((resolve) => {
        const start = Date.now();
        const sock = new net.Socket();
        sock.setTimeout(5000);
        sock.connect({ host: address, port, family }, () => {
            const ms = Date.now() - start;
            sock.destroy();
            resolve({ alive: true, ms });
        });
        sock.on('error', () => { sock.destroy(); resolve({ alive: false, ms: null }); });
        sock.on('timeout', () => { sock.destroy(); resolve({ alive: false, ms: null }); });
    });
}

async function pingHost(hostname, port, ipVersion) {
    const resolved = await resolveByIpVersion(hostname, ipVersion || 'ipv4_priority');
    if (!resolved) return { alive: false, ms: null };
    const { address, family } = resolved;
    if (port && port !== 80 && port !== 443) {
        return await tcpPing(address, port, family);
    }
    let result = await tcpPing(address, port || 443, family);
    if (!result.alive && (!port || port === 443)) result = await tcpPing(address, 80, family);
    return result;
}

function extractHost(input) {
    try {
        if (!input.startsWith('http')) input = 'https://' + input;
        return new URL(input).hostname;
    } catch {
        return input.trim();
    }
}

// POST /api/ping
exports.ping = async (req, res) => {
    const { target, port, ipVersion } = req.body;
    if (!target) return res.status(400).json({ error: 'target required' });
    const hostname = extractHost(target);
    if (!hostname) return res.status(400).json({ error: 'Invalid target' });
    try {
        const result = await pingHost(hostname, port ? Number(port) : null, ipVersion);
        res.json({ hostname, port: port || null, ...result, time: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /api/ping/icmp — live ICMP ping test (used by Ping Monitor live terminal)
exports.icmpPing = async (req, res) => {
    const { target } = req.body;
    if (!target) return res.status(400).json({ error: 'target required' });
    const hostname = extractHost(target);
    if (!hostname) return res.status(400).json({ error: 'Invalid target' });
    try {
        const result = await icmpPing(hostname);
        res.json({ hostname, ...result, time: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
