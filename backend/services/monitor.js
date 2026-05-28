const https = require('https');
const http = require('http');
const Server = require('../models/Server');
const Recipient = require('../models/Recipient');
const Alert = require('../models/Alert');
const Settings = require('../models/Settings');
const wa = require('./whatsapp');
const { checkSSL, checkDomain, extractHostname, extractRootDomain } = require('./expiry');
const { sendEmail, downEmailHtml, recoveredEmailHtml, sslEmailHtml } = require('./email');

// Prevent concurrent checkAll runs (avoids duplicate alerts on overlap)
let checkAllRunning = false;

// Get check interval (seconds) for a given plan from settings
async function getPlanInterval(plan, settings) {
    if (plan === 'free_trial') return settings.freeTrialInterval || 300;
    return settings.plans?.[plan]?.interval || 60;
}
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

function getEligibleRecipients(recipients, serverId, serverUserId) {
    return recipients.filter(r => {
        // Isolate by user: recipient must belong to the same user as the server
        // Admin recipients (userId = null) receive alerts for all servers
        if (r.userId && serverUserId) {
            if (r.userId.toString() !== serverUserId.toString()) return false;
        }
        // Server-level filter: empty list = all sites for this user
        return r.servers.length === 0 || r.servers.some(s => s._id.toString() === serverId.toString());
    });
}

async function checkAll() {
    if (checkAllRunning) {
        console.log('[Monitor] checkAll already running, skipping this tick');
        return;
    }
    checkAllRunning = true;
    try {
        const settings  = await Settings.get();
        const servers   = await Server.find({ active: true }).populate('userId', 'plan');
        const recipients = await Recipient.find({ active: true }).populate('servers');

        for (const server of servers) {
            // Plan-based interval check — only for user-owned servers
            if (server.userId) {
                const plan      = server.userId.plan || 'free_trial';
                const interval  = await getPlanInterval(plan, settings);
                const lastChecked = server.lastChecked ? new Date(server.lastChecked).getTime() : 0;
                if (lastChecked && (Date.now() - lastChecked) < interval * 1000) {
                    // not due yet — skip
                    continue;
                }
            }
            // Admin-owned servers (userId=null) are always checked every 30s

            const result = await checkUrl(server.url);
            const prevStatus = server.status;
            const wasAlertSent = server.downAlertSent;

            // Determine interval label for log
            let intervalLabel = '30s (admin)';
            if (server.userId) {
                const plan = server.userId.plan || 'free_trial';
                const iv = await getPlanInterval(plan, settings);
                intervalLabel = iv >= 60 ? `${iv/60}m (${plan})` : `${iv}s (${plan})`;
            }
            console.log(`[Monitor] ${server.name} → HTTP ${result.code || 0} | ${result.up ? 'UP' : 'DOWN'} | ${result.time}ms | ⏱ ${intervalLabel}`);

            const setFields = {
                lastChecked: new Date(),
                responseTime: result.time,
                httpCode: result.code,
                status: result.up ? 'up' : 'down',
            };

            if (!result.up) {
                const isNewDown = prevStatus !== 'down';
                if (isNewDown) setFields.lastDownAt = new Date();

                console.log(`[Monitor] ${server.name} → isNewDown:${isNewDown} downAlertSent:${wasAlertSent}`);

                if (isNewDown && !wasAlertSent) {
                    // First time down — send alert ONCE, persist flag to DB
                    const eligible = getEligibleRecipients(recipients, server._id, server.userId);
                    console.log(`[Monitor] ${server.name} → DOWN alert to ${eligible.length} recipients`);
                    await sendAlerts(server, eligible, 'down', result.error || `HTTP ${result.code}`);
                    setFields.downAlertSent = true;
                } else {
                    // Still down — save to DB only, no repeated notification
                    console.log(`[Monitor] ${server.name} → still down, no repeated alert`);
                    await saveAlertOnly(server, 'down', result.error || `HTTP ${result.code}`);
                }
            } else {
                if (prevStatus === 'down') {
                    setFields.lastUpAt = new Date();
                    setFields.downAlertSent = false;  // reset flag on recovery
                    const eligible = getEligibleRecipients(recipients, server._id, server.userId);
                    // Recovered — send recovery alert ONCE
                    await sendAlerts(server, eligible, 'recovered', `HTTP ${result.code}`);
                }
            }

            await Server.findByIdAndUpdate(server._id, {
                $set: setFields,
                $push: { history: { $each: [{ time: new Date(), responseTime: result.time, status: result.up ? 'up' : 'down', httpCode: result.code }], $slice: -1440 } },
            });
        }
    } catch (err) {
        console.error('[Monitor] checkAll error:', err.message);
    } finally {
        checkAllRunning = false;
    }
}

// Save alert to DB only — no email/WhatsApp (used while site stays down)
async function saveAlertOnly(server, type, detail) {
    await Alert.create({
        server:     server._id,
        serverName: server.name,
        serverUrl:  server.url,
        type,
        message:    detail,
        sentTo:     [],
    });
}

// Send email + WhatsApp AND save to DB
async function sendAlerts(server, recipients, type, detail) {
    const isDown = type === 'down';
    const waMsg = isDown
        ? `🚨 *Site Down Alert!*\n\n*Site:* ${server.name}\n*URL:* ${server.url}\n*Time:* ${now()}\n\nSite is currently *DOWN* ❌\nPlease check immediately!`
        : `✅ *Site Recovered!*\n\n*Site:* ${server.name}\n*URL:* ${server.url}\n*Time:* ${now()}\n\nSite is back *UP* and running! ✅`;

    const emailSubject = isDown
        ? `[UptimeForge] Site Down: ${server.name}`
        : `[UptimeForge] Site Recovered: ${server.name}`;
    const emailHtml = isDown
        ? downEmailHtml(server.name, server.url, now())
        : recoveredEmailHtml(server.name, server.url, now());

    const sentTo = [];
    for (const r of recipients) {
        if (r.phone) {
            try { await wa.sendMessage(r.phone, waMsg); }
            catch (e) { console.error(`[Monitor] WA failed to ${r.phone}:`, e.message); }
        }
        if (r.email) {
            await sendEmail(r.email, emailSubject, emailHtml);
        }
        sentTo.push({ name: r.name, phone: r.phone || '', email: r.email || '' });
    }

    await Alert.create({
        server:     server._id,
        serverName: server.name,
        serverUrl:  server.url,
        type,
        message:    detail,
        sentTo,
    });

    console.log(`[Monitor] ${type.toUpperCase()} alert sent for ${server.name} to ${sentTo.length} recipients`);
}

async function checkExpiry() {
    try {
        const servers    = await Server.find({ active: true }).populate('userId', 'plan');
        const recipients = await Recipient.find({ active: true }).populate('servers');

        for (const server of servers) {
            // Free trial users do not get SSL & Domain expiry monitoring
            const plan = server.userId?.plan || null;
            if (plan === 'free_trial') continue;

            const hostname = extractHostname(server.url);
            if (!hostname) continue;

            const rootDomain = extractRootDomain(hostname);
            const [ssl, domain] = await Promise.all([checkSSL(hostname), checkDomain(rootDomain)]);

            if (ssl) {
                server.sslExpiry = ssl.expiry;
                server.sslDaysLeft = ssl.daysLeft;
                if (SSL_MILESTONES.includes(ssl.daysLeft)) {
                    const eligible = getEligibleRecipients(recipients, server._id, server.userId);
                    const emoji = ssl.daysLeft <= 7 ? '🚨' : ssl.daysLeft <= 15 ? '⚠️' : '📢';
                    const waMsg = `${emoji} *SSL Certificate Alert!*\n\n*Site:* ${server.name}\n*URL:* ${server.url}\n*Expires:* ${ssl.expiry.toDateString()}\n*Days Left:* ${ssl.daysLeft} days\n\nPlease renew SSL certificate!`;
                    for (const r of eligible) {
                        if (r.phone) { try { await wa.sendMessage(r.phone, waMsg); } catch (_) {} }
                        if (r.email) { await sendEmail(r.email, `[UptimeForge] SSL Expiring: ${server.name} (${ssl.daysLeft} days)`, sslEmailHtml(server.name, server.url, ssl.daysLeft, ssl.expiry)); }
                    }
                    console.log(`[Monitor] SSL expiry alert sent for ${server.name} (${ssl.daysLeft} days left)`);
                }
            }

            // Domain expiry — auto fetched via api.whois.vu
            if (domain) {
                server.domainExpiry = domain.expiry;
                const domainDaysLeft = domain.daysLeft;
                if (DOMAIN_MILESTONES.includes(domainDaysLeft)) {
                    const eligible = getEligibleRecipients(recipients, server._id, server.userId);
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
    setInterval(checkAll, 30 * 1000); // run every 30s, each server checked per its plan interval
    setInterval(checkExpiry, 6 * 60 * 60 * 1000); // every 6 hours
    console.log('[Monitor] Started - ticker every 30s (plan-based intervals) | Expiry check every 6h');
}

module.exports = { start, checkAll };
