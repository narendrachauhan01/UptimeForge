const https = require('https');
const http = require('http');
const net = require('net');
const Server = require('../models/Server');
const PingTarget = require('../models/PingTarget');
const Recipient = require('../models/Recipient');
const Alert = require('../models/Alert');
const Settings = require('../models/Settings');
const Integration = require('../models/Integration');
const wa = require('./whatsapp');
const { checkSSL, checkDomain, extractHostname, extractRootDomain } = require('./expiry');
const { sendEmail, downEmailHtml, recoveredEmailHtml, sslEmailHtml } = require('./email');

// Prevent concurrent checkAll runs (avoids duplicate alerts on overlap)
let checkAllRunning = false;

// Fire user-configured integrations (Slack, Discord, Webhook, etc.)
async function fireIntegrations(server, type, userId) {
    if (!userId) return;
    try {
        const integrations = await Integration.find({ userId, active: true });
        for (const intg of integrations) {
            // Check event type
            if (intg.events === 'down' && type !== 'down') continue;
            // Check server filter — empty = all servers
            if (intg.servers?.length > 0 && !intg.servers.some(s => s.toString() === server._id.toString())) continue;

            const isDown = type === 'down';
            const now = new Date();
            const timeStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });

            const payload = {
                text: isDown ? `🚨 *${server.name}* is DOWN — ${server.url}` : `✅ *${server.name}* is back UP — ${server.url}`,
                event: type,
                site: server.name,
                url: server.url,
                status: isDown ? 'DOWN' : 'UP',
                time: now.toISOString(),
                attachments: [{
                    color: isDown ? '#ef4444' : '#22c55e',
                    title: isDown ? `🚨 ${server.name} is DOWN` : `✅ ${server.name} is back UP`,
                    title_link: server.url,
                    fields: [
                        { title: 'Status', value: isDown ? '🔴 DOWN' : '🟢 UP', short: true },
                        { title: 'Time',   value: timeStr,                        short: true },
                        { title: 'URL',    value: server.url,                     short: false },
                    ],
                    footer: 'UptimeForge Monitor',
                }],
            };

            // SSL / Domain expiry handled separately via fireExpiryIntegrations
            const color     = isDown ? '#ef4444' : '#22c55e';
            const colorHex  = isDown ? 0xef4444  : 0x22c55e;
            const title     = isDown ? `🚨 ${server.name} is DOWN` : `✅ ${server.name} is back UP`;

            // RocketChat & Slack — attachments format
            const rcSlackBody = JSON.stringify({
                attachments: [{
                    color,
                    title,
                    title_link: server.url,
                    fields: [
                        { title: 'Status', value: isDown ? '🔴 DOWN' : '🟢 UP', short: true },
                        { title: 'Time',   value: timeStr,                        short: true },
                        { title: 'URL',    value: server.url,                     short: false },
                    ],
                    footer: 'UptimeForge Monitor',
                }]
            });

            // Discord — embeds format
            const discordBody = JSON.stringify({
                username: 'UptimeForge Alert',
                embeds: [{
                    color: colorHex,
                    title,
                    url: server.url,
                    fields: [
                        { name: 'Status', value: isDown ? '🔴 DOWN' : '🟢 UP', inline: true },
                        { name: 'Time',   value: timeStr,                        inline: true },
                        { name: 'URL',    value: server.url,                     inline: false },
                    ],
                    footer: { text: 'UptimeForge Monitor' },
                }]
            });

            // Telegram — markdown
            const tgText = isDown
                ? `🚨 *${server.name} is DOWN*\n🔴 Status: DOWN\n🕐 Time: ${timeStr}\n🌐 URL: ${server.url}`
                : `✅ *${server.name} is back UP*\n🟢 Status: UP\n🕐 Time: ${timeStr}\n🌐 URL: ${server.url}`;

            try {
                if (['slack','discord','webhook','rocketchat'].includes(intg.type)) {
                    const url = intg.config?.url;
                    if (!url) continue;
                    const body = intg.type === 'rocketchat' || intg.type === 'slack'
                        ? rcSlackBody
                        : intg.type === 'discord'
                        ? discordBody
                        : JSON.stringify(payload);

                    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
                    if (intg.config?.secret) headers['X-UptimeForge-Secret'] = intg.config.secret;

                    const mod = url.startsWith('https') ? https : http;
                    const parsed = new URL(url);
                    const req = mod.request({ hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'POST', headers }, () => {});
                    req.on('error', () => {});
                    req.write(body);
                    req.end();
                }
                if (intg.type === 'telegram') {
                    const { botToken, chatId } = intg.config || {};
                    if (!botToken || !chatId) continue;
                    const tUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
                    const body = JSON.stringify({ chat_id: chatId, text: tgText, parse_mode: 'Markdown' });
                    const req = https.request(tUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, () => {});
                    req.on('error', () => {});
                    req.write(body);
                    req.end();
                }
            } catch (_) {}
        }
    } catch (_) {}
}

async function fireExpiryIntegrations(server, expiryType, daysLeft, expiryDate, extra) {
    const userId = server.userId?._id || server.userId;
    if (!userId) return;
    try {
        const integrations = await Integration.find({ userId, active: true });
        const now = new Date();
        const timeStr = now.toLocaleString('en-IN', { timeZone:'Asia/Kolkata', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
        const expiryStr = expiryDate ? new Date(expiryDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A';
        const emoji = daysLeft <= 7 ? '🚨' : daysLeft <= 15 ? '⚠️' : '📢';
        const isSSL = expiryType === 'ssl';
        const label = isSSL ? 'SSL Certificate' : 'Domain';
        const color = daysLeft <= 7 ? '#ef4444' : daysLeft <= 15 ? '#f59e0b' : '#3b82f6';
        const colorHex = daysLeft <= 7 ? 0xef4444 : daysLeft <= 15 ? 0xf59e0b : 0x3b82f6;
        const title = `${emoji} ${label} Expiring in ${daysLeft} days: ${server.name}`;

        const rcSlackBody = JSON.stringify({
            attachments: [{
                color,
                title,
                title_link: server.url,
                fields: [
                    { title: 'Service',         value: server.name,           short: true  },
                    { title: 'Days Until Expiry',value: `${daysLeft} days`,   short: true  },
                    { title: 'URL',             value: server.url,            short: false },
                    { title: 'Expires At',      value: expiryStr,             short: true  },
                    ...(extra ? [{ title: isSSL ? 'Issuer' : 'Registrar', value: extra, short: true }] : []),
                ],
                footer: 'UptimeForge Monitor',
            }]
        });

        const discordBody = JSON.stringify({
            username: 'UptimeForge Alert',
            embeds: [{
                color: colorHex,
                title,
                url: server.url,
                fields: [
                    { name: 'Service',          value: server.name,          inline: true  },
                    { name: 'Days Until Expiry', value: `${daysLeft} days`,  inline: true  },
                    { name: 'URL',              value: server.url,           inline: false },
                    { name: 'Expires At',       value: expiryStr,            inline: true  },
                    ...(extra ? [{ name: isSSL ? 'Issuer' : 'Registrar', value: extra, inline: true }] : []),
                ],
                footer: { text: 'UptimeForge Monitor' },
            }]
        });

        const tgText = `${emoji} *${label} Expiring in ${daysLeft} days!*\n\n*Service:* ${server.name}\n*URL:* ${server.url}\n*Days Until Expiry:* ${daysLeft} days\n*Expires At:* ${expiryStr}${extra ? `\n*${isSSL ? 'Issuer' : 'Registrar'}:* ${extra}` : ''}`;

        for (const intg of integrations) {
            if (intg.events === 'down') continue; // skip if only down events
            if (intg.servers?.length > 0 && !intg.servers.some(s => s.toString() === server._id.toString())) continue;
            try {
                if (['slack','discord','webhook','rocketchat'].includes(intg.type)) {
                    const url = intg.config?.url;
                    if (!url) continue;
                    const body = intg.type === 'rocketchat' || intg.type === 'slack'
                        ? rcSlackBody
                        : intg.type === 'discord'
                        ? discordBody
                        : JSON.stringify({ event: expiryType, site: server.name, url: server.url, daysLeft, expiresAt: expiryStr });
                    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
                    const mod = url.startsWith('https') ? https : http;
                    const parsed = new URL(url);
                    const req = mod.request({ hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'POST', headers }, () => {});
                    req.on('error', () => {});
                    req.write(body);
                    req.end();
                }
                if (intg.type === 'telegram') {
                    const { botToken, chatId } = intg.config || {};
                    if (!botToken || !chatId) continue;
                    const tUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
                    const b = JSON.stringify({ chat_id: chatId, text: tgText, parse_mode: 'Markdown' });
                    const req = https.request(tUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, () => {});
                    req.on('error', () => {});
                    req.write(b);
                    req.end();
                }
            } catch (_) {}
        }
    } catch (_) {}
}

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

function checkUrl(url, options = {}) {
    const { timeout = 10, followRedirects = true, httpMethod = 'GET', upCodes = [200, 301, 302] } = options;
    return new Promise((resolve) => {
        const mod = url.startsWith('https') ? https : http;
        const start = Date.now();
        const method = httpMethod.toUpperCase();

        const makeReq = (targetUrl, redirectCount = 0) => {
            const reqOpts = { method, timeout: timeout * 1000, rejectUnauthorized: false };
            const req = mod.request(targetUrl, reqOpts, (res) => {
                // Follow redirects if enabled
                if (followRedirects && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectCount < 5) {
                    const location = res.headers.location;
                    const nextUrl = location.startsWith('http') ? location : new URL(location, targetUrl).href;
                    res.resume();
                    return makeReq(nextUrl, redirectCount + 1);
                }
                const codes = upCodes.length ? upCodes : [200, 301, 302];
                resolve({ up: codes.includes(res.statusCode), code: res.statusCode, time: Date.now() - start });
            });
            req.on('error', (e) => resolve({ up: false, code: 0, error: e.message, time: Date.now() - start }));
            req.on('timeout', () => { req.destroy(); resolve({ up: false, code: 0, error: 'Timeout', time: Date.now() - start }); });
            req.end();
        };
        makeReq(url);
    });
}

function getEligibleRecipients(recipients, serverId, serverUserId) {
    // serverUserId may be populated object {_id, plan} or raw ObjectId — normalize
    const serverUserIdStr = serverUserId
        ? (serverUserId._id ? serverUserId._id.toString() : serverUserId.toString())
        : null;

    return recipients.filter(r => {
        // Isolate by user: recipient must belong to the same user as the server
        // Admin recipients (userId = null) receive alerts for all servers
        if (r.userId && serverUserIdStr) {
            if (r.userId.toString() !== serverUserIdStr) return false;
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

            const result = await checkUrl(server.url, {
                timeout:         server.timeout         || 10,
                followRedirects: server.followRedirects !== false,
                httpMethod:      server.httpMethod       || 'GET',
                upCodes:         server.upCodes?.length  ? server.upCodes : [200, 301, 302],
            });
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

                if (!wasAlertSent) {
                    // Alert not sent yet (new down OR was down but alert missed) — send NOW
                    const eligible = getEligibleRecipients(recipients, server._id, server.userId);
                    console.log(`[Monitor] ${server.name} → DOWN alert to ${eligible.length} recipients`);
                    await sendAlerts(server, eligible, 'down', result.error || `HTTP ${result.code}`);
                    await fireIntegrations(server, 'down', server.userId?._id || server.userId);
                    setFields.downAlertSent = true;
                } else {
                    // Alert already sent, site still down — no repeat
                    console.log(`[Monitor] ${server.name} → still down, alert already sent`);
                    await saveAlertOnly(server, 'down', result.error || `HTTP ${result.code}`);
                }
            } else {
                if (prevStatus === 'down') {
                    setFields.lastUpAt = new Date();
                    setFields.downAlertSent = false;  // reset flag on recovery
                    const eligible = getEligibleRecipients(recipients, server._id, server.userId);
                    // Recovered — send recovery alert ONCE
                    await sendAlerts(server, eligible, 'recovered', `HTTP ${result.code}`);
                    await fireIntegrations(server, 'up', server.userId?._id || server.userId);
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
            try { await sendEmail(r.email, emailSubject, emailHtml); }
            catch (e) { console.error(`[Monitor] Email failed to ${r.email}:`, e.message); }
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
                    await fireExpiryIntegrations(server, 'ssl', ssl.daysLeft, ssl.expiry, ssl.issuer);
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
                        if (r.phone) { try { await wa.sendMessage(r.phone, msg); } catch (_) {} }
                    }
                    await fireExpiryIntegrations(server, 'domain', domainDaysLeft, domain.expiry, domain.registrar);
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

// ── TCP Ping check ──────────────────────────────────────────────────────────
function tcpPing(host, port) {
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

async function pingCheck(host, port) {
    // If port explicitly set, only try that port
    if (port && port !== 80 && port !== 443) {
        return await tcpPing(host, port);
    }
    // Default: try 443 then 80
    let r = await tcpPing(host, port || 443);
    if (!r.alive && (!port || port === 443)) r = await tcpPing(host, 80);
    return r;
}

// ── Check all ping targets ───────────────────────────────────────────────────
async function checkPingTargets() {
    try {
        const settings  = await Settings.get();
        const targets   = await PingTarget.find({ active: true }).populate('userId', 'plan');
        const recipients = await Recipient.find({ active: true }).populate('servers');

        for (const target of targets) {
            // Plan-based ping interval
            if (target.userId) {
                const plan = target.userId.plan || 'free_trial';
                const pingInterval = plan === 'free_trial'
                    ? (settings.freeTrialPingInterval || 180)
                    : (settings.plans?.[plan]?.pingInterval || 60);
                const lastChecked = target.lastChecked ? new Date(target.lastChecked).getTime() : 0;
                if (lastChecked && (Date.now() - lastChecked) < pingInterval * 1000) continue;
            }

            const result = await pingCheck(target.host, target.port);
            const prevStatus = target.status;
            const wasAlertSent = target.downAlertSent;

            console.log(`[Ping] ${target.name} (${target.host}) → ${result.alive ? 'UP' : 'DOWN'} | ${result.ms || '—'}ms`);

            const setFields = {
                lastChecked: new Date(),
                responseTime: result.ms,
                status: result.alive ? 'up' : 'down',
            };

            // Get eligible recipients — MUST have notifyRecipients selected, empty = no alerts
            const getPingEligible = () => {
                if (!target.notifyRecipients || target.notifyRecipients.length === 0) return []; // no selection = no alerts
                const ids = target.notifyRecipients.map(id => id.toString());
                return recipients.filter(r => ids.includes(r._id.toString()));
            };

            if (!result.alive) {
                if (prevStatus !== 'down') setFields.lastDownAt = new Date();
                if (prevStatus !== 'down' && !wasAlertSent) {
                    const eligible = getPingEligible();
                    const waMsg = `🚨 *Ping Alert!*\n\n*Target:* ${target.name}\n*Host:* ${target.host}\n*Time:* ${now()}\n\nHost is *DOWN* ❌`;
                    for (const r of eligible) {
                        if (r.phone) { try { await wa.sendMessage(r.phone, waMsg); } catch (_) {} }
                        if (r.email) { try { await sendEmail(r.email, `[UptimeForge] Host Down: ${target.name}`, downEmailHtml(target.name, target.host, now())); } catch(_){} }
                    }
                    setFields.downAlertSent = true;
                }
            } else {
                if (prevStatus === 'down') {
                    setFields.lastUpAt = new Date();
                    setFields.downAlertSent = false;
                    const eligible = getPingEligible();
                    const waMsg = `✅ *Host Recovered!*\n\n*Target:* ${target.name}\n*Host:* ${target.host}\n*Time:* ${now()}\n\nHost is back *UP* ✅`;
                    for (const r of eligible) {
                        if (r.phone) { try { await wa.sendMessage(r.phone, waMsg); } catch (_) {} }
                        if (r.email) { try { await sendEmail(r.email, `[UptimeForge] Host Recovered: ${target.name}`, recoveredEmailHtml(target.name, target.host, now())); } catch(_){} }
                    }
                }
            }

            await PingTarget.findByIdAndUpdate(target._id, {
                $set: setFields,
                $push: { history: { $each: [{ time: new Date(), responseTime: result.ms, status: result.alive ? 'up' : 'down' }], $slice: -1440 } },
            });
        }
    } catch (err) {
        console.error('[Ping] checkPingTargets error:', err.message);
    }
}

function start() {
    checkAll();
    checkExpiry();
    checkPingTargets();
    setInterval(checkAll, 30 * 1000);
    setInterval(checkExpiry, 6 * 60 * 60 * 1000);
    setInterval(checkPingTargets, 30 * 1000); // ticker 30s, each target checked per plan interval
    console.log('[Monitor] Started - ticker every 30s | Ping plan-based | Expiry check every 6h');
}

module.exports = { start, checkAll };
