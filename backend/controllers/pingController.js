const net = require('net');
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

function tcpPing(host, port = 80) {
    return new Promise((resolve) => {
        const start = Date.now();
        const sock = new net.Socket();
        sock.setTimeout(5000);
        sock.connect(port, host, () => {
            const ms = Date.now() - start;
            sock.destroy();
            resolve({ alive: true, ms });
        });
        sock.on('error', () => { sock.destroy(); resolve({ alive: false, ms: null }); });
        sock.on('timeout', () => { sock.destroy(); resolve({ alive: false, ms: null }); });
    });
}

async function pingHost(hostname, port) {
    if (port && port !== 80 && port !== 443) {
        return await tcpPing(hostname, port);
    }
    let result = await tcpPing(hostname, port || 443);
    if (!result.alive && (!port || port === 443)) result = await tcpPing(hostname, 80);
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
    const { target, port } = req.body;
    if (!target) return res.status(400).json({ error: 'target required' });
    const hostname = extractHost(target);
    if (!hostname) return res.status(400).json({ error: 'Invalid target' });
    try {
        const result = await pingHost(hostname, port ? Number(port) : null);
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
