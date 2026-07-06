require('dotenv').config();
const os = require('os');
const { execSync } = require('child_process');
const https = require('https');
const http  = require('http');

const API_URL     = process.env.API_URL || '';
const AGENT_KEY   = process.env.AGENT_KEY || '';
const SERVER_ID   = process.env.SERVER_ID || os.hostname();
const SERVER_NAME = process.env.SERVER_NAME || os.hostname();
const INTERVAL    = parseInt(process.env.INTERVAL_SEC || '30') * 1000;

if (!AGENT_KEY) { console.error('[Agent] AGENT_KEY not set'); process.exit(1); }
if (!API_URL)   { console.error('[Agent] API_URL not set');   process.exit(1); }

function getCpuUsage() {
    return new Promise((resolve) => {
        const c1 = os.cpus();
        setTimeout(() => {
            const c2 = os.cpus();
            let idle = 0, total = 0;
            for (let i = 0; i < c1.length; i++) {
                const t1 = c1[i].times, t2 = c2[i].times;
                idle  += t2.idle  - t1.idle;
                total += Object.values(t2).reduce((a, b) => a + b, 0) - Object.values(t1).reduce((a, b) => a + b, 0);
            }
            resolve(Math.round((1 - idle / total) * 100));
        }, 1000);
    });
}

function getDiskUsage() {
    try {
        const out = execSync("df / --output=used,size --block-size=1 | tail -1").toString().trim();
        const [used, total] = out.split(/\s+/).map(Number);
        return { diskUsed: used, diskTotal: total };
    } catch { return { diskUsed: 0, diskTotal: 0 }; }
}

function getSwapInfo() {
    try {
        const out = execSync("cat /proc/meminfo | grep -E 'SwapTotal|SwapFree'", { timeout: 3000 }).toString();
        const total = parseInt(out.match(/SwapTotal:\s+(\d+)/)?.[1] || 0) * 1024;
        const free  = parseInt(out.match(/SwapFree:\s+(\d+)/)?.[1]  || 0) * 1024;
        return { swapTotal: total, swapUsed: total - free };
    } catch { return { swapTotal: 0, swapUsed: 0 }; }
}

function getLoadAverage() {
    try {
        const out = execSync("uptime", { timeout: 3000 }).toString();
        const m   = out.match(/load average[s]?:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/i);
        if (m) return { load1: parseFloat(m[1]), load5: parseFloat(m[2]), load15: parseFloat(m[3]) };
    } catch (_) {}
    const [l1, l5, l15] = os.loadavg();
    return { load1: +l1.toFixed(2), load5: +l5.toFixed(2), load15: +l15.toFixed(2) };
}

function getCpuInfo() {
    try {
        const out = execSync("lscpu", { timeout: 3000 }).toString();
        const get = (key) => out.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim() || '';
        return { cores: parseInt(get('CPU\\(s\\)')) || os.cpus().length, model: get('Model name') || os.cpus()[0]?.model?.trim() || 'Unknown', arch: get('Architecture') || os.arch() };
    } catch {
        const c = os.cpus();
        return { cores: c.length, model: c[0]?.model?.trim() || 'Unknown', arch: os.arch() };
    }
}

function getLocalIp() {
    try {
        const out = execSync("ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \\K[\\d.]+'", { timeout: 3000 }).toString().trim();
        if (out) return out;
    } catch (_) {}
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return '127.0.0.1';
}

function getPublicIp() {
    return new Promise((resolve) => {
        try {
            const ip = execSync("curl -s --max-time 5 ifconfig.me", { timeout: 6000 }).toString().trim();
            if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return resolve(ip);
        } catch (_) {}
        https.get('https://api.ipify.org', { timeout: 5000 }, (res) => {
            let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d.trim()));
        }).on('error', () => resolve(null));
    });
}

function getActiveSessions() {
    try {
        return execSync("w", { encoding: 'utf8', timeout: 3000 })
            .split('\n').slice(2).filter(Boolean)
            .map(line => { const p = line.trim().split(/\s+/); return { user: p[0], tty: p[1], from: p[2], loginTime: p[3], idle: p[4], what: p.slice(7).join(' ') }; })
            .filter(s => s.tty && s.tty.startsWith('pts/'));
    } catch { return []; }
}

function getLastSsh() {
    const cmds = [
        "last -n 10 2>/dev/null | grep -v 'wtmp\\|reboot\\|^$' | head -5",
        "grep 'sshd.*Accepted' /var/log/auth.log 2>/dev/null | tail -5",
    ];
    for (const cmd of cmds) {
        try {
            const out = execSync(cmd, { timeout: 3000, stdio: ['pipe','pipe','pipe'] }).toString().trim();
            if (!out) continue;
            const lines = out.split('\n').filter(Boolean).map(line => {
                const ip = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)?.[1];
                const p  = line.trim().split(/\s+/);
                return { user: p[0], ip: ip || null, time: p.slice(3, 7).join(' ') };
            }).filter(l => l.ip);
            if (lines.length > 0) return lines.slice(0, 3);
        } catch (_) { continue; }
    }
    return [];
}

async function collect() {
    const [cpu, publicIp] = await Promise.all([getCpuUsage(), getPublicIp()]);
    const { diskUsed, diskTotal } = getDiskUsage();
    const { swapTotal, swapUsed } = getSwapInfo();
    const { load1, load5, load15 } = getLoadAverage();
    const cpuInfo = getCpuInfo();
    const data = {
        serverId: SERVER_ID, serverName: SERVER_NAME,
        hostname: os.hostname(), platform: os.platform(),
        cpu, ramUsed: os.totalmem() - os.freemem(), ramTotal: os.totalmem(),
        diskUsed, diskTotal, swapUsed, swapTotal, load1, load5, load15,
        uptime: os.uptime(), cpuCores: cpuInfo.cores, cpuModel: cpuInfo.model, cpuArch: cpuInfo.arch,
        localIp: getLocalIp(), publicIp,
        activeSessions: getActiveSessions(), lastSsh: getLastSsh(),
    };
    sendMetrics(data);
}

function sendMetrics(data) {
    const body = JSON.stringify(data);
    const url  = new URL(`${API_URL}/api/metrics`);
    const mod  = url.protocol === 'https:' ? https : http;
    const req  = mod.request({
        hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'x-agent-key': AGENT_KEY },
    }, (res) => {
        if (res.statusCode === 200) console.log(`[Agent] ✅ CPU:${data.cpu}% RAM:${Math.round(data.ramUsed/1024/1024)}MB`);
        else { let b = ''; res.on('data', d => b += d); res.on('end', () => console.error(`[Agent] ❌ ${res.statusCode}: ${b}`)); }
    });
    req.on('error', (e) => console.error('[Agent] Error:', e.message));
    req.write(body); req.end();
}

console.log(`[Agent] Starting — ${SERVER_NAME} → ${API_URL}`);
collect();
setInterval(collect, INTERVAL);
