const tls = require('tls');
const https = require('https');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { lazyConnect: true, enableOfflineQueue: false });
redis.on('error', () => {}); // silent if Redis not available

const TTL = 30 * 60; // 30 minutes

async function redisGet(key) {
    try { const v = await redis.get(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
async function redisSet(key, val) {
    try { await redis.set(key, JSON.stringify(val), 'EX', TTL); } catch {}
}

function extractCert(cert) {
    if (!cert || !cert.valid_to) return null;
    const expiry = new Date(cert.valid_to);
    if (isNaN(expiry.getTime())) return null;
    const daysLeft = Math.floor((expiry - Date.now()) / (1000 * 60 * 60 * 24));
    const issuer = cert.issuer?.O || cert.issuer?.CN || null;
    return { expiry, daysLeft, issuer };
}

function tlsConnect(hostname) {
    return new Promise((resolve) => {
        const socket = tls.connect(
            { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false, timeout: 10000 },
            () => {
                try {
                    const result = extractCert(socket.getPeerCertificate());
                    socket.destroy();
                    resolve(result);
                } catch (_) { socket.destroy(); resolve(null); }
            }
        );
        socket.on('error', () => resolve(null));
        socket.on('timeout', () => { socket.destroy(); resolve(null); });
    });
}

function httpsRequest(hostname, method = 'GET') {
    return new Promise((resolve) => {
        const req = https.request({
            host: hostname, port: 443,
            method, path: '/',
            rejectUnauthorized: false,
            timeout: 12000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        }, (res) => {
            try {
                const result = extractCert(res.socket.getPeerCertificate());
                res.socket.destroy();
                res.resume();
                resolve(result);
            } catch (_) { resolve(null); }
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.end();
    });
}

async function checkSSL(hostname) {
    // Check Redis cache first (40 min TTL)
    const cached = await redisGet(`ssl:${hostname}`);
    if (cached) { console.log(`[Redis] SSL cache hit: ${hostname}`); return cached; }
    // 1. Direct TLS (fastest, works for most sites including Cloudflare with SNI)
    let result = await tlsConnect(hostname);
    if (result) { await redisSet(`ssl:${hostname}`, result); return result; }

    // 2. HTTPS GET (for sites that need actual HTTP request)
    result = await httpsRequest(hostname, 'GET');
    if (result) { await redisSet(`ssl:${hostname}`, result); return result; }

    // 3. HTTPS HEAD fallback
    result = await httpsRequest(hostname, 'HEAD');
    if (result) await redisSet(`ssl:${hostname}`, result);
    return result;
}

function fetchWhois(rootDomain) {
    return new Promise((resolve, reject) => {
        const url = `https://api.whois.vu/?q=${encodeURIComponent(rootDomain)}`;
        const req = https.get(url, {
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UptimeForge/1.0)' },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.expires) {
                        const expiry = new Date(json.expires * 1000);
                        const daysLeft = Math.floor((expiry - Date.now()) / (1000 * 60 * 60 * 24));
                        return resolve({ expiry, daysLeft, registrar: json.registrar || null });
                    }
                    reject(new Error('no expires field'));
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function checkDomain(rootDomain) {
    // Check Redis cache (40 min TTL)
    const cached = await redisGet(`domain:${rootDomain}`);
    if (cached) { console.log(`[Redis] Domain cache hit: ${rootDomain}`); return cached; }

    // Retry up to 3 times with increasing delay
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 1500));
            const result = await fetchWhois(rootDomain);
            if (result) { await redisSet(`domain:${rootDomain}`, result); }
            return result;
        } catch (_) {}
    }
    return null;
}

function extractHostname(url) {
    try {
        return new URL(url).hostname;
    } catch (_) { return null; }
}

function extractRootDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;
    // Handle multi-level TLDs: co.in, org.in, net.in, co.uk, org.uk etc.
    const secondLevel = parts[parts.length - 2];
    const multiLevelTlds = ['co', 'org', 'net', 'gov', 'edu', 'ac', 'com'];
    if (parts.length >= 3 && multiLevelTlds.includes(secondLevel) && parts[parts.length - 1].length === 2) {
        return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
}

module.exports = { checkSSL, checkDomain, extractHostname, extractRootDomain };
