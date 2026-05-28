const tls = require('tls');
const https = require('https');

function checkSSL(hostname) {
    // Try HTTPS request first (works through Cloudflare proxy)
    return new Promise((resolve) => {
        const req = https.request({
            host: hostname,
            port: 443,
            method: 'HEAD',
            path: '/',
            rejectUnauthorized: false,
            timeout: 12000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UptimeForge/1.0)' },
        }, (res) => {
            try {
                const cert = res.socket.getPeerCertificate();
                res.socket.destroy();
                if (!cert || !cert.valid_to) return resolve(null);
                const expiry = new Date(cert.valid_to);
                const daysLeft = Math.floor((expiry - Date.now()) / (1000 * 60 * 60 * 24));
                const issuer = cert.issuer?.O || cert.issuer?.CN || null;
                resolve({ expiry, daysLeft, issuer });
            } catch (_) { resolve(null); }
        });
        req.on('error', () => {
            // Fallback: direct TLS connect with SNI
            const socket = tls.connect(
                { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false, timeout: 10000 },
                () => {
                    try {
                        const cert = socket.getPeerCertificate();
                        socket.destroy();
                        if (!cert || !cert.valid_to) return resolve(null);
                        const expiry = new Date(cert.valid_to);
                        const daysLeft = Math.floor((expiry - Date.now()) / (1000 * 60 * 60 * 24));
                        resolve({ expiry, daysLeft, issuer: cert.issuer?.O || cert.issuer?.CN || null });
                    } catch (_) { resolve(null); }
                }
            );
            socket.on('error', () => resolve(null));
            socket.on('timeout', () => { socket.destroy(); resolve(null); });
        });
        req.on('timeout', () => { req.destroy(); });
        req.end();
    });
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
    // Retry up to 3 times with increasing delay
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 1500));
            return await fetchWhois(rootDomain);
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
