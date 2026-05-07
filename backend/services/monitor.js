const https = require('https');
const http = require('http');
const Server = require('../models/Server');
const Recipient = require('../models/Recipient');
const Alert = require('../models/Alert');
const wa = require('./whatsapp');
const { checkSSL, checkDomain, extractHostname, extractRootDomain } = require('./expiry');

const COOLDOWN_MS = 30 * 60 * 1000;
const lastAlertTime = {};
const SSL_MILESTONES = [30, 15, 7];   // alert at these days remaining
const DOMAIN_MILESTONES = [30, 15, 7];

function now() {
    return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function checkUrl(url) {
    return new Promise((resolve) => {
        const mod = url.startsWith('https') ? https : http;
        const start = Date.now();
        const req = mod.get(url, { timeout: 10000, rejectUnauthorized: false }, (res) => {
            const upCodes = [200, 301, 302];
            resolve({ up: upCodes.includes(res.statusCode), code: res.statusCode, time: Date.now() - start });
        });
        req.on('error', (e) => resolve({ up: false, code: 0, error: e.message, time: Date.now() - start }));
        req.on('timeout', () => { req.destroy(); resolve({ up: false, code: 0, error: 'Timeout', time: Date.now() - start }); });
    });
}

function getEligibleRecipients(recipients, serverId) {
    return recipients.filter(r =>
        r.servers.length === 0 ||
        r.servers.some(s => s._id.toString() === serverId.toString())
    );
}

async function checkAll() {
    try {
        const servers = await Server.find({ active: true });
        const recipients = await Recipient.find({ active: true }).populate('servers');

        for (const server of servers) {
            const result = await checkUrl(server.url);
            const prevStatus = server.status;

            server.lastChecked = new Date();
            server.responseTime = result.time;
            server.httpCode = result.code;

            console.log(`[Monitor] ${server.name} → HTTP ${result.code || 0} | ${result.up ? 'UP' : 'DOWN'} | ${result.time}ms`);

            if (!result.up) {
                server.status = 'down';
                if (prevStatus !== 'down') server.lastDownAt = new Date();

                const cooldownOk = !lastAlertTime[server._id] || (Date.now() - lastAlertTime[server._id]) > COOLDOWN_MS;
                if (prevStatus !== 'down' || cooldownOk) {
                    const eligible = getEligibleRecipients(recipients, server._id);
                    await sendAlerts(server, eligible, 'down', result.error || `HTTP ${result.code}`);
                    lastAlertTime[server._id] = Date.now();
                }
            } else {
                server.status = 'up';
                if (prevStatus === 'down') {
                    server.lastUpAt = new Date();
                    const eligible = getEligibleRecipients(recipients, server._id);
                    await sendAlerts(server, eligible, 'recovered', `HTTP ${result.code}`);
                    delete lastAlertTime[server._id];
                }
            }

            // Save history (keep last 50 data points)
            server.history = server.history || [];
            server.history.push({
                time: new Date(),
                responseTime: result.time,
                status: result.up ? 'up' : 'down',
                httpCode: result.code,
            });
            if (server.history.length > 50) server.history = server.history.slice(-50);

            await server.save();
        }
    } catch (err) {
        console.error('[Monitor] checkAll error:', err.message);
    }
}

async function sendAlerts(server, recipients, type, detail) {
    const isDown = type === 'down';
    const msg = isDown
        ? `🚨 *Site Down Alert!*\n\n*Site:* ${server.name}\n*URL:* ${server.url}\n*Time:* ${now()}\n\nSite is currently *DOWN* ❌\nPlease check immediately!`
        : `✅ *Site Recovered!*\n\n*Site:* ${server.name}\n*URL:* ${server.url}\n*Time:* ${now()}\n\nSite is back *UP* and running! ✅`;

    const sentTo = [];
    for (const r of recipients) {
        try {
            await wa.sendMessage(r.phone, msg);
            sentTo.push({ name: r.name, phone: r.phone });
        } catch (e) {
            console.error(`[Monitor] Failed to send to ${r.phone}:`, e.message);
        }
    }

    await Alert.create({
        server: server._id,
        serverName: server.name,
        serverUrl: server.url,
        type,
        message: detail,
        sentTo,
    });

    console.log(`[Monitor] ${type.toUpperCase()} alert sent for ${server.name} to ${sentTo.length} recipients`);
}

async function checkExpiry() {
    try {
        const servers = await Server.find({ active: true });
        const recipients = await Recipient.find({ active: true }).populate('servers');

        for (const server of servers) {
            const hostname = extractHostname(server.url);
            if (!hostname) continue;

            const rootDomain = extractRootDomain(hostname);
            const [ssl, domain] = await Promise.all([checkSSL(hostname), checkDomain(rootDomain)]);

            if (ssl) {
                server.sslExpiry = ssl.expiry;
                server.sslDaysLeft = ssl.daysLeft;
                if (SSL_MILESTONES.includes(ssl.daysLeft)) {
                    const eligible = getEligibleRecipients(recipients, server._id);
                    const emoji = ssl.daysLeft <= 7 ? '🚨' : ssl.daysLeft <= 15 ? '⚠️' : '📢';
                    const msg = `${emoji} *SSL Certificate Alert!*\n\n*Site:* ${server.name}\n*URL:* ${server.url}\n*Expires:* ${ssl.expiry.toDateString()}\n*Days Left:* ${ssl.daysLeft} days\n\nPlease renew the SSL certificate before it expires!`;
                    for (const r of eligible) {
                        try { await wa.sendMessage(r.phone, msg); } catch (_) {}
                    }
                    console.log(`[Monitor] SSL expiry alert sent for ${server.name} (${ssl.daysLeft} days left)`);
                }
            }

            // Domain expiry — auto fetched via api.whois.vu
            if (domain) {
                server.domainExpiry = domain.expiry;
                const domainDaysLeft = domain.daysLeft;
                if (DOMAIN_MILESTONES.includes(domainDaysLeft)) {
                    const eligible = getEligibleRecipients(recipients, server._id);
                    const emoji = domainDaysLeft <= 7 ? '🚨' : domainDaysLeft <= 15 ? '⚠️' : '📢';
                    const msg = `${emoji} *Domain Expiry Alert!*\n\n*Site:* ${server.name}\n*Domain:* ${rootDomain}\n*Expires:* ${domain.expiry.toDateString()}\n*Days Left:* ${domainDaysLeft} days\n\nPlease renew the domain before it expires!`;
                    for (const r of eligible) {
                        try { await wa.sendMessage(r.phone, msg); } catch (_) {}
                    }
                    console.log(`[Monitor] Domain expiry alert sent for ${server.name} (${domainDaysLeft} days left)`);
                }
            }

            // Use findByIdAndUpdate to avoid version conflict with checkAll
            const update = {};
            if (ssl) { update.sslExpiry = ssl.expiry; update.sslDaysLeft = ssl.daysLeft; }
            if (domain) { update.domainExpiry = domain.expiry; }
            if (Object.keys(update).length > 0) {
                await Server.findByIdAndUpdate(server._id, update);
            }
            console.log(`[Monitor] Expiry — ${server.name} | SSL: ${ssl ? ssl.daysLeft + 'd' : 'N/A'} | Domain: ${domain ? domain.daysLeft + 'd' : 'N/A'}`);
        }
    } catch (err) {
        console.error('[Monitor] checkExpiry error:', err.message);
    }
}

function start() {
    checkAll();
    checkExpiry();
    setInterval(checkAll, 60 * 1000);
    setInterval(checkExpiry, 6 * 60 * 60 * 1000); // every 6 hours
    console.log('[Monitor] Started - checking every 60s | Expiry check every 6h');
}

module.exports = { start, checkAll };
