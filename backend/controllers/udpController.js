const dgram = require('dgram');

const HOST_RE = /^[a-zA-Z0-9.\-:]+$/;

function udpProbe(host, port) {
    return new Promise((resolve) => {
        const start = Date.now();
        const sock = dgram.createSocket('udp4');
        let done = false;
        const finish = (alive) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try { sock.close(); } catch (_) {}
            resolve({ alive, ms: alive ? Date.now() - start : null });
        };
        const timer = setTimeout(() => finish(false), 5000);
        sock.on('message', () => finish(true));
        sock.on('error', () => finish(false));
        sock.send(Buffer.from('ping'), port, host, (err) => {
            if (err) finish(false);
        });
    });
}

// POST /api/udp/probe — live UDP probe test (used by UDP Monitoring detail page)
exports.probe = async (req, res) => {
    const { host, port } = req.body;
    if (!host || !HOST_RE.test(host)) return res.status(400).json({ error: 'Valid host required' });
    const p = Number(port);
    if (!p || p < 1 || p > 65535) return res.status(400).json({ error: 'Valid port required' });
    try {
        const result = await udpProbe(host, p);
        res.json({ host, port: p, ...result, time: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports.udpProbe = udpProbe;
