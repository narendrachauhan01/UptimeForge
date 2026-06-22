const https = require('https');
const http = require('http');
const net = require('net');
const dns = require('dns');
const dgram = require('dgram');
const { execFile } = require('child_process');
const axios = require('axios');
const cron = require('node-cron');
const Server = require('../models/Server');
const PingTarget = require('../models/PingTarget');
const IcmpTarget = require('../models/IcmpTarget');
const DnsTarget = require('../models/DnsTarget');
const UdpTarget = require('../models/UdpTarget');
const Recipient = require('../models/Recipient');
const Alert = require('../models/Alert');
const Settings = require('../models/Settings');
const Integration = require('../models/Integration');
const wa = require('./whatsapp');
const { checkSSL, checkDomain, extractHostname, extractRootDomain } = require('./expiry');
const { sendEmail, downEmailHtml, recoveredEmailHtml, sslEmailHtml, pingDownEmailHtml, pingRecoveredEmailHtml } = require('./email');
const { notifLog } = require('./notifLogger');

// Per-server lock — prevents duplicate alerts if a check overlaps next tick
const serverLocks = new Set();

// Fire user-configured integrations (Slack, Discord, Webhook, etc.)
async function fireIntegrations(server, type, userId, statusCode) {
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
            const codeLabel = statusCodeLabel(statusCode);

            const payload = {
                text: '🔔 *UptimeForge Alert*',
                event: type,
                site: server.name,
                url: server.url,
                status: isDown ? 'DOWN' : 'UP',
                statusCode: statusCode ?? null,
                time: now.toISOString(),
                attachments: [{
                    color: isDown ? '#ef4444' : '#22c55e',
                    title: isDown ? `🚨 ${server.name} is DOWN` : `✅ ${server.name} is back UP`,
                    title_link: server.url,
                    fields: [
                        { title: 'Status',      value: isDown ? '🔴 DOWN' : '🟢 UP', short: true },
                        { title: 'Status Code', value: codeLabel,                     short: true },
                        { title: 'Time',        value: timeStr,                        short: true },
                        { title: 'URL',         value: server.url,                     short: false },
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
                text: '🔔 *UptimeForge Alert*',
                attachments: [{
                    color,
                    title,
                    title_link: server.url,
                    fields: [
                        { title: 'Status',      value: isDown ? '🔴 DOWN' : '🟢 UP', short: true },
                        { title: 'Status Code', value: codeLabel,                     short: true },
                        { title: 'Time',        value: timeStr,                        short: true },
                        { title: 'URL',         value: server.url,                     short: false },
                    ],
                    footer: 'UptimeForge Monitor',
                }]
            });

            // Discord — embeds format
            const discordBody = JSON.stringify({
                username: 'UptimeForge Alert',
                content: '🔔 **UptimeForge Alert**',
                embeds: [{
                    color: colorHex,
                    title,
                    url: server.url,
                    fields: [
                        { name: 'Status',      value: isDown ? '🔴 DOWN' : '🟢 UP', inline: true },
                        { name: 'Status Code', value: codeLabel,                     inline: true },
                        { name: 'Time',        value: timeStr,                        inline: true },
                        { name: 'URL',         value: server.url,                     inline: false },
                    ],
                    footer: { text: 'UptimeForge Monitor' },
                }]
            });

            // Telegram — markdown
            const tgText = isDown
                ? `🚨 *${server.name} is DOWN*\n🔴 Status: DOWN\n📟 Status Code: ${codeLabel}\n🕐 Time: ${timeStr}\n🌐 URL: ${server.url}`
                : `✅ *${server.name} is back UP*\n🟢 Status: UP\n📟 Status Code: ${codeLabel}\n🕐 Time: ${timeStr}\n🌐 URL: ${server.url}`;

            try {
                if (['slack','discord','webhook','rocketchat'].includes(intg.type)) {
                    const url = intg.config?.url;
                    if (!url) {
                        notifLog('WARN', intg.type.toUpperCase(), server.name, userId, `skipped — no URL configured`);
                        continue;
                    }
                    const data = intg.type === 'rocketchat' || intg.type === 'slack'
                        ? JSON.parse(rcSlackBody)
                        : intg.type === 'discord'
                        ? JSON.parse(discordBody)
                        : payload;
                    const headers = { 'Content-Type': 'application/json' };
                    if (intg.config?.secret) headers['X-UptimeForge-Secret'] = intg.config.secret;
                    notifLog('INFO', intg.type.toUpperCase(), server.name, userId, `firing (event:${type})`);
                    axios.post(url, data, { headers, timeout: 10000 })
                        .then(() => notifLog('INFO', intg.type.toUpperCase(), server.name, userId, `OK`))
                        .catch(e => {
                            const detail = e.response?.data?.message || e.response?.data?.error || e.response?.data?.description || e.message || String(e);
                            notifLog('ERROR', intg.type.toUpperCase(), server.name, userId, `FAILED (HTTP ${e.response?.status || 'N/A'}): ${detail}`);
                        });
                }
                if (intg.type === 'telegram') {
                    const chatId   = intg.config?.chatId;
                    const botToken = process.env.TELEGRAM_BOT_TOKEN;
                    if (!chatId || !botToken) {
                        notifLog('WARN', 'TELEGRAM', server.name, userId, `skipped — missing chatId or TELEGRAM_BOT_TOKEN`);
                        continue;
                    }
                    notifLog('INFO', 'TELEGRAM', server.name, userId, `firing (event:${type})`);
                    axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: chatId, text: tgText, parse_mode: 'Markdown' }, { timeout: 10000 })
                        .then(() => notifLog('INFO', 'TELEGRAM', server.name, userId, `OK`))
                        .catch(e => {
                            const detail = e.response?.data?.description || e.response?.data?.error || e.message || String(e);
                            notifLog('ERROR', 'TELEGRAM', server.name, userId, `FAILED (HTTP ${e.response?.status || 'N/A'}): ${detail}`);
                        });
                }
            } catch (e) { notifLog('ERROR', intg.type?.toUpperCase() || 'UNKNOWN', server.name, userId, `Exception: ${e.message}`); }
        }
    } catch (e) { notifLog('ERROR', 'SYSTEM', server.name, '', `fireIntegrations error: ${e.message}`); }
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
            text: '🔔 *UptimeForge Alert*',
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

        const uid = String(userId);
        for (const intg of integrations) {
            if (intg.events === 'down') continue;
            if (intg.servers?.length > 0 && !intg.servers.some(s => s.toString() === server._id.toString())) continue;
            try {
                if (['slack','discord','webhook','rocketchat'].includes(intg.type)) {
                    const url = intg.config?.url;
                    if (!url) {
                        notifLog('WARN', intg.type.toUpperCase(), server.name, uid, `expiry skipped — no URL configured`);
                        continue;
                    }
                    const data = intg.type === 'rocketchat' || intg.type === 'slack'
                        ? JSON.parse(rcSlackBody)
                        : intg.type === 'discord'
                        ? JSON.parse(discordBody)
                        : { event: expiryType, site: server.name, url: server.url, daysLeft, expiresAt: expiryStr };
                    const headers = { 'Content-Type': 'application/json' };
                    notifLog('INFO', intg.type.toUpperCase(), server.name, uid, `expiry firing (${expiryType}, ${daysLeft}d left)`);
                    axios.post(url, data, { headers, timeout: 10000 })
                        .then(() => notifLog('INFO', intg.type.toUpperCase(), server.name, uid, `expiry OK`))
                        .catch(e => {
                            const detail = e.response?.data?.message || e.response?.data?.error || e.message || String(e);
                            notifLog('ERROR', intg.type.toUpperCase(), server.name, uid, `expiry FAILED (HTTP ${e.response?.status || 'N/A'}): ${detail}`);
                        });
                }
                if (intg.type === 'telegram') {
                    const chatId   = intg.config?.chatId;
                    const botToken = process.env.TELEGRAM_BOT_TOKEN;
                    if (!chatId || !botToken) {
                        notifLog('WARN', 'TELEGRAM', server.name, uid, `expiry skipped — missing chatId or TELEGRAM_BOT_TOKEN`);
                        continue;
                    }
                    notifLog('INFO', 'TELEGRAM', server.name, uid, `expiry firing (${expiryType}, ${daysLeft}d left)`);
                    axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: chatId, text: tgText, parse_mode: 'Markdown' }, { timeout: 10000 })
                        .then(() => notifLog('INFO', 'TELEGRAM', server.name, uid, `expiry OK`))
                        .catch(e => {
                            const detail = e.response?.data?.description || e.response?.data?.error || e.message || String(e);
                            notifLog('ERROR', 'TELEGRAM', server.name, uid, `expiry FAILED (HTTP ${e.response?.status || 'N/A'}): ${detail}`);
                        });
                }
            } catch (e) { notifLog('ERROR', intg.type?.toUpperCase() || 'UNKNOWN', server.name, uid, `expiry Exception: ${e.message}`); }
        }
    } catch (e) { notifLog('ERROR', 'EXPIRY', server.name, String(userId), `fireExpiryIntegrations error: ${e.message}`); }
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

// Human-friendly status code label — 0 means no HTTP response was received (timeout/connection error)
function statusCodeLabel(code) {
    return (code && code !== 0) ? String(code) : '0 (No Response / Timeout)';
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

async function checkOne(server, settings, recipients) {
    const sid = server._id.toString();
    if (serverLocks.has(sid)) return; // already being checked this cycle

    // Plan-based interval + expiry check
    if (server.userId) {
        const u    = server.userId;
        const plan = u.plan || 'free_trial';

        // Stop monitoring if plan expired
        if (plan === 'free_trial') {
            if (!u.trialVerified) return; // not yet verified
            if (u.trialEndsAt && new Date() > new Date(u.trialEndsAt)) return; // trial expired
        } else {
            if (u.planEndsAt && new Date() > new Date(u.planEndsAt)) return; // paid plan expired
        }

        const interval    = await getPlanInterval(plan, settings);
        const lastChecked = server.lastChecked ? new Date(server.lastChecked).getTime() : 0;
        if (lastChecked && (Date.now() - lastChecked) < interval * 1000) return;
    }
    serverLocks.add(sid);

    const result = await checkUrl(server.url, {
        timeout:         server.timeout         || 10,
        followRedirects: server.followRedirects !== false,
        httpMethod:      server.httpMethod       || 'GET',
        upCodes:         server.upCodes?.length  ? server.upCodes : [200, 301, 302],
    });

    const prevStatus   = server.status;
    const wasAlertSent = server.downAlertSent;

    let intervalLabel = '30s (admin)';
    if (server.userId) {
        const plan = server.userId.plan || 'free_trial';
        const iv   = await getPlanInterval(plan, settings);
        intervalLabel = iv >= 60 ? `${iv/60}m (${plan})` : `${iv}s (${plan})`;
    }
    console.log(`[Monitor] ${server.name} → HTTP ${result.code || 0} | ${result.up ? 'UP' : 'DOWN'} | ${result.time}ms | ⏱ ${intervalLabel}`);

    const setFields = {
        lastChecked:  new Date(),
        responseTime: result.time,
        httpCode:     result.code,
        status:       result.up ? 'up' : 'down',
    };

    let alertType = null;
    let alertDetail = null;

    if (!result.up) {
        const isNewDown = prevStatus !== 'down';
        if (isNewDown) setFields.lastDownAt = new Date();
        if (!wasAlertSent) {
            setFields.downAlertSent = true;
            alertType = 'down';
            alertDetail = result.error || `HTTP ${result.code}`;
        }
        // site still down — do NOT save duplicate alert, just log
    } else {
        if (prevStatus === 'down') {
            setFields.lastUpAt      = new Date();
            setFields.downAlertSent = false;
            alertType   = 'recovered';
            alertDetail = `HTTP ${result.code}`;
        }
    }

    // 1. Write DB first — so next tick sees correct state
    await Server.findByIdAndUpdate(server._id, {
        $set:  setFields,
        $push: { history: { $each: [{ time: new Date(), responseTime: result.time, status: result.up ? 'up' : 'down', httpCode: result.code }], $slice: -1440 } },
    });

    // 2. Release lock — next tick can check this server again
    serverLocks.delete(sid);

    // 3. Fire alerts & integrations in background (only if plan active)
    const uObj = server.userId;
    const planActive = uObj ? (() => {
        if (uObj.plan === 'free_trial') {
            if (!uObj.trialVerified) return false;
            if (uObj.trialEndsAt && new Date() > new Date(uObj.trialEndsAt)) return false;
            return true;
        }
        if (uObj.planEndsAt && new Date() > new Date(uObj.planEndsAt)) return false;
        return true;
    })() : false;

    if (alertType && planActive) {
        const eligible = getEligibleRecipients(recipients, server._id, server.userId);
        const userId   = server.userId?._id || server.userId;
        const intType  = alertType === 'recovered' ? 'up' : 'down';
        console.log(`[Monitor] ${server.name} → ${alertType.toUpperCase()} alert | recipients: ${eligible.length} | emails: ${eligible.filter(r=>r.email).map(r=>r.email).join(',')||'none'}`);
        sendAlerts(server, eligible, alertType === 'recovered' ? 'recovered' : 'down', alertDetail, result.code)
            .catch(e => notifLog('ERROR', 'SYSTEM', server.name, String(userId), `sendAlerts failed: ${e.message}`));
        fireIntegrations(server, intType, userId, result.code).catch(e => notifLog('ERROR', 'SYSTEM', server.name, String(userId), `fireIntegrations unhandled: ${e.message}`));
    }
}

async function checkAll() {
    try {
        const [settings, servers, recipients] = await Promise.all([
            Settings.get(),
            Server.find({ active: true }).populate('userId', 'plan trialEndsAt planEndsAt trialVerified'),
            Recipient.find({ active: true }).populate('servers'),
        ]);
        // Fire all checks in parallel — per-server lock prevents duplicates
        Promise.allSettled(servers.map(server => checkOne(server, settings, recipients)));
    } catch (err) {
        console.error('[Monitor] checkAll error:', err.message);
    }
}

// Send email + WhatsApp AND save to DB
async function sendAlerts(server, recipients, type, detail, statusCode) {
    const isDown = type === 'down';
    const codeLabel = statusCodeLabel(statusCode);
    const waMsg = isDown
        ? `🚨 *Site Down Alert!*\n\n*Site:* ${server.name}\n*URL:* ${server.url}\n*Status Code:* ${codeLabel}\n*Time:* ${now()}\n\nSite is currently *DOWN* ❌\nPlease check immediately!`
        : `✅ *Site Recovered!*\n\n*Site:* ${server.name}\n*URL:* ${server.url}\n*Status Code:* ${codeLabel}\n*Time:* ${now()}\n\nSite is back *UP* and running! ✅`;

    const emailSubject = isDown
        ? `[UptimeForge] Site Down: ${server.name}`
        : `[UptimeForge] Site Recovered: ${server.name}`;
    const emailHtml = isDown
        ? downEmailHtml(server.name, server.url, now(), codeLabel)
        : recoveredEmailHtml(server.name, server.url, now(), codeLabel);

    const uid = String(server.userId?._id || server.userId || '');
    const sentTo = [];
    for (const r of recipients) {
        if (r.phone) {
            try {
                await wa.sendMessage(r.phone, waMsg);
                notifLog('INFO', 'WHATSAPP', server.name, uid, `OK → ${r.phone} (${r.name})`);
            } catch (e) {
                notifLog('ERROR', 'WHATSAPP', server.name, uid, `FAILED → ${r.phone} (${r.name}): ${e.message}`);
            }
        }
        if (r.email) {
            try {
                await sendEmail(r.email, emailSubject, emailHtml);
                notifLog('INFO', 'EMAIL', server.name, uid, `OK → ${r.email} (${r.name})`);
            } catch (e) {
                notifLog('ERROR', 'EMAIL', server.name, uid, `FAILED → ${r.email} (${r.name}): ${e.message}`);
            }
        }
        sentTo.push({ name: r.name, phone: r.phone || '', email: r.email || '' });
    }

    await Alert.create({
        server:     server._id,
        userId:     server.userId?._id || server.userId,
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
        const servers    = await Server.find({ active: true }).populate('userId', 'plan trialEndsAt planEndsAt trialVerified');
        const recipients = await Recipient.find({ active: true }).populate('servers');

        for (const server of servers) {
            const u    = server.userId;
            const plan = u?.plan || null;
            // Skip free trial and expired plans
            if (plan === 'free_trial') continue;
            if (u?.planEndsAt && new Date() > new Date(u.planEndsAt)) continue;

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
function resolveDnsFamily(host, family) {
    return new Promise((resolve) => {
        dns.lookup(host, { family }, (err, address) => {
            if (err) return resolve(null);
            resolve(address);
        });
    });
}

// Resolves hostname to an address per the chosen IP version preference.
// "priority" modes try the preferred family first, falling back only if
// that family has no DNS record at all (not if the connection itself fails).
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

function tcpPing(address, port, family) {
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

async function pingCheck(host, port, ipVersion) {
    const resolved = await resolveByIpVersion(host, ipVersion || 'ipv4_priority');
    if (!resolved) return { alive: false, ms: null };
    const { address, family } = resolved;
    // If port explicitly set, only try that port
    if (port && port !== 80 && port !== 443) {
        return await tcpPing(address, port, family);
    }
    // Default: try 443 then 80
    let r = await tcpPing(address, port || 443, family);
    if (!r.alive && (!port || port === 443)) r = await tcpPing(address, 80, family);
    return r;
}

// ── ICMP Ping check (real ping command — for Ping Monitor feature) ──────────
const ICMP_HOST_RE = /^[a-zA-Z0-9.\-:]+$/;
function icmpPingCheck(host) {
    return new Promise((resolve) => {
        if (!ICMP_HOST_RE.test(host)) return resolve({ alive: false, ms: null });
        const isWin = process.platform === 'win32';
        const args = isWin ? ['-n', '1', '-w', '2000', host] : ['-c', '1', '-W', '2', host];
        execFile('ping', args, { timeout: 5000 }, (err, stdout) => {
            if (err) return resolve({ alive: false, ms: null });
            const match = (stdout || '').match(/time[=<]([\d.]+)/i);
            resolve({ alive: true, ms: match ? Math.round(parseFloat(match[1])) : null });
        });
    });
}

// ── DNS resolution check (for DNS Monitoring feature) ───────────────────────
function dnsWithTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('ETIMEDOUT')), ms)),
    ]);
}
async function dnsCheck(hostname, recordType, expectedValue, dnsServer) {
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
            case 'AAAA':  values = await dnsWithTimeout(resolver.resolve6(hostname), 5000); break;
            case 'CNAME': values = await dnsWithTimeout(resolver.resolveCname(hostname), 5000); break;
            case 'MX':    values = (await dnsWithTimeout(resolver.resolveMx(hostname), 5000)).map(r => r.exchange); break;
            case 'TXT':   values = (await dnsWithTimeout(resolver.resolveTxt(hostname), 5000)).map(arr => arr.join('')); break;
            case 'NS':    values = await dnsWithTimeout(resolver.resolveNs(hostname), 5000); break;
            default:      values = await dnsWithTimeout(resolver.resolve4(hostname), 5000);
        }
        const ms = Date.now() - start;
        const exp = (expectedValue || '').trim().toLowerCase();
        const matches = !exp || values.some(v => String(v).toLowerCase().includes(exp));
        return { alive: matches, ms, values };
    } catch (e) {
        return { alive: false, ms: Date.now() - start, values: [] };
    }
}

// ── UDP probe check (for UDP Monitoring feature) ─────────────────────────────
const UDP_PROBE_COUNT = 5;

function udpSingleProbe(host, port, payload, timeoutMs) {
    return new Promise((resolve) => {
        const start = Date.now();
        const sock = dgram.createSocket('udp4');
        let done = false;
        const finish = (received, data) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try { sock.close(); } catch (_) {}
            resolve({ received, ms: received ? Date.now() - start : null, data: data || '' });
        };
        const timer = setTimeout(() => finish(false), timeoutMs);
        sock.on('message', (msg) => finish(true, msg.toString()));
        sock.on('error', () => finish(false));
        sock.send(Buffer.from(payload || 'ping'), port, host, (err) => {
            if (err) finish(false);
        });
    });
}

async function udpCheck(host, port, payload, timeoutSec, packetLossThreshold, expectedKeyword) {
    const timeoutMs = Math.max(1, timeoutSec || 30) * 1000;
    const probes = await Promise.all(
        Array.from({ length: UDP_PROBE_COUNT }, () => udpSingleProbe(host, port, payload, timeoutMs))
    );
    const received = probes.filter(p => p.received);
    const lossPct = Math.round(((UDP_PROBE_COUNT - received.length) / UDP_PROBE_COUNT) * 100);
    const avgMs = received.length ? Math.round(received.reduce((s, p) => s + p.ms, 0) / received.length) : null;
    const keyword = (expectedKeyword || '').trim();
    const keywordOk = !keyword || received.some(p => p.data.includes(keyword));
    const alive = lossPct <= (packetLossThreshold ?? 5) && keywordOk;
    return { alive, ms: avgMs, lossPct };
}

// ── Check all ping targets ───────────────────────────────────────────────────
async function checkPingTargets() {
    try {
        const settings  = await Settings.get();
        const targets   = await PingTarget.find({ active: true }).populate('userId', 'plan trialEndsAt planEndsAt trialVerified');
        const recipients = await Recipient.find({ active: true }).populate('servers');

        for (const target of targets) {
            if (target.userId) {
                const u = target.userId;
                const plan = u.plan || 'free_trial';
                // Stop ping if plan expired
                if (plan === 'free_trial') {
                    if (!u.trialVerified) continue;
                    if (u.trialEndsAt && new Date() > new Date(u.trialEndsAt)) continue;
                } else {
                    if (u.planEndsAt && new Date() > new Date(u.planEndsAt)) continue;
                }
            }
            // Plan-based ping interval
            if (target.userId) {
                const plan = target.userId.plan || 'free_trial';
                const pingInterval = plan === 'free_trial'
                    ? (settings.freeTrialPingInterval || 180)
                    : (settings.plans?.[plan]?.pingInterval || 60);
                const lastChecked = target.lastChecked ? new Date(target.lastChecked).getTime() : 0;
                if (lastChecked && (Date.now() - lastChecked) < pingInterval * 1000) continue;
            }

            const result = await pingCheck(target.host, target.port, target.ipVersion);
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
                    const sentTo = [];
                    const waMsg = `🚨 *Ping Alert!*\n\n*Target:* ${target.name}\n*Host:* ${target.host}\n*Time:* ${now()}\n\nHost is *DOWN* ❌`;
                    for (const r of eligible) {
                        if (r.phone) { try { await wa.sendMessage(r.phone, waMsg); } catch (_) {} }
                        if (r.email) { try { await sendEmail(r.email, `[UptimeForge] Host Down: ${target.name}`, pingDownEmailHtml(target.name, target.host, now())); } catch(_){} }
                        sentTo.push({ name: r.name, phone: r.phone||'', email: r.email||'' });
                    }
                    fireIntegrations(
                        { _id: target._id, name: target.name, url: `${target.host}${target.port ? ':' + target.port : ''}` },
                        'down',
                        target.userId?._id || target.userId,
                        null
                    ).catch(() => {});
                    // Save to Incidents
                    await Alert.create({
                        userId:     target.userId || null,
                        serverName: target.name,
                        serverUrl:  `${target.host}${target.port ? ':' + target.port : ''}`,
                        type:       'down',
                        message:    `Ping target unreachable`,
                        sentTo,
                        source:     'ping',
                    }).catch(() => {});
                    setFields.downAlertSent = true;
                }
            } else {
                if (prevStatus === 'down') {
                    setFields.lastUpAt = new Date();
                    setFields.downAlertSent = false;
                    const eligible = getPingEligible();
                    const sentTo = [];
                    const waMsg = `✅ *Host Recovered!*\n\n*Target:* ${target.name}\n*Host:* ${target.host}\n*Time:* ${now()}\n\nHost is back *UP* ✅`;
                    for (const r of eligible) {
                        if (r.phone) { try { await wa.sendMessage(r.phone, waMsg); } catch (_) {} }
                        if (r.email) { try { await sendEmail(r.email, `[UptimeForge] Host Recovered: ${target.name}`, pingRecoveredEmailHtml(target.name, target.host, now())); } catch(_){} }
                        sentTo.push({ name: r.name, phone: r.phone||'', email: r.email||'' });
                    }
                    fireIntegrations(
                        { _id: target._id, name: target.name, url: `${target.host}${target.port ? ':' + target.port : ''}` },
                        'up',
                        target.userId?._id || target.userId,
                        null
                    ).catch(() => {});
                    // Save to Incidents
                    await Alert.create({
                        userId:     target.userId || null,
                        serverName: target.name,
                        serverUrl:  `${target.host}${target.port ? ':' + target.port : ''}`,
                        type:       'recovered',
                        message:    `Ping target back online`,
                        sentTo,
                        source:     'ping',
                    }).catch(() => {});
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

// ── Check all ICMP ping monitor targets (real ping, no port) ────────────────
async function checkIcmpTargets() {
    try {
        const settings   = await Settings.get();
        const targets    = await IcmpTarget.find({ active: true }).populate('userId', 'plan trialEndsAt planEndsAt trialVerified');
        const recipients = await Recipient.find({ active: true }).populate('servers');

        for (const target of targets) {
            if (target.userId) {
                const u = target.userId;
                const plan = u.plan || 'free_trial';
                if (plan === 'free_trial') {
                    if (!u.trialVerified) continue;
                    if (u.trialEndsAt && new Date() > new Date(u.trialEndsAt)) continue;
                } else {
                    if (u.planEndsAt && new Date() > new Date(u.planEndsAt)) continue;
                }
            }
            if (target.userId) {
                const plan = target.userId.plan || 'free_trial';
                const pingInterval = plan === 'free_trial'
                    ? (settings.freeTrialPingInterval || 180)
                    : (settings.plans?.[plan]?.pingInterval || 60);
                const lastChecked = target.lastChecked ? new Date(target.lastChecked).getTime() : 0;
                if (lastChecked && (Date.now() - lastChecked) < pingInterval * 1000) continue;
            }

            const result = await icmpPingCheck(target.host);
            const prevStatus = target.status;
            const wasAlertSent = target.downAlertSent;
            const uid = String(target.userId?._id || target.userId || '');

            console.log(`[IcmpPing] ${target.name} (${target.host}) → ${result.alive ? 'UP' : 'DOWN'} | ${result.ms || '—'}ms`);

            const setFields = {
                lastChecked: new Date(),
                responseTime: result.ms,
                status: result.alive ? 'up' : 'down',
            };

            const getEligible = () => {
                if (!target.notifyRecipients || target.notifyRecipients.length === 0) return [];
                const ids = target.notifyRecipients.map(id => id.toString());
                return recipients.filter(r => ids.includes(r._id.toString()));
            };

            if (!result.alive) {
                if (prevStatus !== 'down') setFields.lastDownAt = new Date();
                if (prevStatus !== 'down' && !wasAlertSent) {
                    const eligible = getEligible();
                    const sentTo = [];
                    const waMsg = `🚨 *Ping Alert!*\n\n*Target:* ${target.name}\n*Host:* ${target.host}\n*Time:* ${now()}\n\nHost is *DOWN* ❌`;
                    for (const r of eligible) {
                        if (r.phone) {
                            try { await wa.sendMessage(r.phone, waMsg); notifLog('INFO', 'WHATSAPP', target.name, uid, `OK → ${r.phone} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'WHATSAPP', target.name, uid, `FAILED → ${r.phone}: ${e.message}`); }
                        }
                        if (r.email) {
                            try { await sendEmail(r.email, `[UptimeForge] Host Down: ${target.name}`, pingDownEmailHtml(target.name, target.host, now())); notifLog('INFO', 'EMAIL', target.name, uid, `OK → ${r.email} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'EMAIL', target.name, uid, `FAILED → ${r.email}: ${e.message}`); }
                        }
                        sentTo.push({ name: r.name, phone: r.phone||'', email: r.email||'' });
                    }
                    fireIntegrations(
                        { _id: target._id, name: target.name, url: target.host },
                        'down',
                        target.userId?._id || target.userId,
                        null
                    ).catch(e => notifLog('ERROR', 'SYSTEM', target.name, uid, `fireIntegrations unhandled: ${e.message}`));
                    await Alert.create({
                        userId:     target.userId || null,
                        serverName: target.name,
                        serverUrl:  target.host,
                        type:       'down',
                        message:    `Ping target unreachable`,
                        sentTo,
                        source:     'ping',
                    }).catch(() => {});
                    setFields.downAlertSent = true;
                }
            } else {
                if (prevStatus === 'down') {
                    setFields.lastUpAt = new Date();
                    setFields.downAlertSent = false;
                    const eligible = getEligible();
                    const sentTo = [];
                    const waMsg = `✅ *Host Recovered!*\n\n*Target:* ${target.name}\n*Host:* ${target.host}\n*Time:* ${now()}\n\nHost is back *UP* ✅`;
                    for (const r of eligible) {
                        if (r.phone) {
                            try { await wa.sendMessage(r.phone, waMsg); notifLog('INFO', 'WHATSAPP', target.name, uid, `OK → ${r.phone} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'WHATSAPP', target.name, uid, `FAILED → ${r.phone}: ${e.message}`); }
                        }
                        if (r.email) {
                            try { await sendEmail(r.email, `[UptimeForge] Host Recovered: ${target.name}`, pingRecoveredEmailHtml(target.name, target.host, now())); notifLog('INFO', 'EMAIL', target.name, uid, `OK → ${r.email} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'EMAIL', target.name, uid, `FAILED → ${r.email}: ${e.message}`); }
                        }
                        sentTo.push({ name: r.name, phone: r.phone||'', email: r.email||'' });
                    }
                    fireIntegrations(
                        { _id: target._id, name: target.name, url: target.host },
                        'up',
                        target.userId?._id || target.userId,
                        null
                    ).catch(e => notifLog('ERROR', 'SYSTEM', target.name, uid, `fireIntegrations unhandled: ${e.message}`));
                    await Alert.create({
                        userId:     target.userId || null,
                        serverName: target.name,
                        serverUrl:  target.host,
                        type:       'recovered',
                        message:    `Ping target back online`,
                        sentTo,
                        source:     'ping',
                    }).catch(() => {});
                }
            }

            await IcmpTarget.findByIdAndUpdate(target._id, {
                $set: setFields,
                $push: { history: { $each: [{ time: new Date(), responseTime: result.ms, status: result.alive ? 'up' : 'down' }], $slice: -1440 } },
            });
        }
    } catch (err) {
        console.error('[IcmpPing] checkIcmpTargets error:', err.message);
    }
}

// ── Check all DNS monitor targets ────────────────────────────────────────────
async function checkDnsTargets() {
    try {
        const settings   = await Settings.get();
        const targets    = await DnsTarget.find({ active: true }).populate('userId', 'plan trialEndsAt planEndsAt trialVerified');
        const recipients = await Recipient.find({ active: true }).populate('servers');

        for (const target of targets) {
            if (target.userId) {
                const u = target.userId;
                const plan = u.plan || 'free_trial';
                if (plan === 'free_trial') {
                    if (!u.trialVerified) continue;
                    if (u.trialEndsAt && new Date() > new Date(u.trialEndsAt)) continue;
                } else {
                    if (u.planEndsAt && new Date() > new Date(u.planEndsAt)) continue;
                }
            }
            if (target.userId) {
                const plan = target.userId.plan || 'free_trial';
                const pingInterval = plan === 'free_trial'
                    ? (settings.freeTrialPingInterval || 180)
                    : (settings.plans?.[plan]?.pingInterval || 60);
                const lastChecked = target.lastChecked ? new Date(target.lastChecked).getTime() : 0;
                if (lastChecked && (Date.now() - lastChecked) < pingInterval * 1000) continue;
            }

            const result = await dnsCheck(target.hostname, target.recordType, target.expectedValue, target.dnsServer);
            const prevStatus = target.status;
            const wasAlertSent = target.downAlertSent;
            const uid = String(target.userId?._id || target.userId || '');

            console.log(`[DNS] ${target.name} (${target.hostname} ${target.recordType}) → ${result.alive ? 'UP' : 'DOWN'} | ${result.ms || '—'}ms | ${result.values.join(', ') || 'no answer'}`);

            const setFields = {
                lastChecked: new Date(),
                responseTime: result.ms,
                status: result.alive ? 'up' : 'down',
                resolvedValues: result.values,
            };

            const getEligible = () => {
                if (!target.notifyRecipients || target.notifyRecipients.length === 0) return [];
                const ids = target.notifyRecipients.map(id => id.toString());
                return recipients.filter(r => ids.includes(r._id.toString()));
            };

            if (!result.alive) {
                if (prevStatus !== 'down') setFields.lastDownAt = new Date();
                if (prevStatus !== 'down' && !wasAlertSent) {
                    const eligible = getEligible();
                    const sentTo = [];
                    const reason = target.expectedValue
                        ? `did not resolve to expected value "${target.expectedValue}"`
                        : 'failed to resolve';
                    const waMsg = `🚨 *DNS Alert!*\n\n*Target:* ${target.name}\n*Host:* ${target.hostname} (${target.recordType})\n*Time:* ${now()}\n\nDNS check ${reason} ❌`;
                    for (const r of eligible) {
                        if (r.phone) {
                            try { await wa.sendMessage(r.phone, waMsg); notifLog('INFO', 'WHATSAPP', target.name, uid, `OK → ${r.phone} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'WHATSAPP', target.name, uid, `FAILED → ${r.phone}: ${e.message}`); }
                        }
                        if (r.email) {
                            try { await sendEmail(r.email, `[UptimeForge] DNS Issue: ${target.name}`, pingDownEmailHtml(target.name, `${target.hostname} (${target.recordType})`, now())); notifLog('INFO', 'EMAIL', target.name, uid, `OK → ${r.email} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'EMAIL', target.name, uid, `FAILED → ${r.email}: ${e.message}`); }
                        }
                        sentTo.push({ name: r.name, phone: r.phone||'', email: r.email||'' });
                    }
                    fireIntegrations(
                        { _id: target._id, name: target.name, url: target.hostname },
                        'down',
                        target.userId?._id || target.userId,
                        null
                    ).catch(e => notifLog('ERROR', 'SYSTEM', target.name, uid, `fireIntegrations unhandled: ${e.message}`));
                    await Alert.create({
                        userId:     target.userId || null,
                        serverName: target.name,
                        serverUrl:  target.hostname,
                        type:       'down',
                        message:    `DNS check failed — ${reason}`,
                        sentTo,
                        source:     'ping',
                    }).catch(() => {});
                    setFields.downAlertSent = true;
                }
            } else {
                if (prevStatus === 'down') {
                    setFields.lastUpAt = new Date();
                    setFields.downAlertSent = false;
                    const eligible = getEligible();
                    const sentTo = [];
                    const waMsg = `✅ *DNS Recovered!*\n\n*Target:* ${target.name}\n*Host:* ${target.hostname} (${target.recordType})\n*Time:* ${now()}\n\nDNS now resolves correctly ✅`;
                    for (const r of eligible) {
                        if (r.phone) {
                            try { await wa.sendMessage(r.phone, waMsg); notifLog('INFO', 'WHATSAPP', target.name, uid, `OK → ${r.phone} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'WHATSAPP', target.name, uid, `FAILED → ${r.phone}: ${e.message}`); }
                        }
                        if (r.email) {
                            try { await sendEmail(r.email, `[UptimeForge] DNS Recovered: ${target.name}`, pingRecoveredEmailHtml(target.name, `${target.hostname} (${target.recordType})`, now())); notifLog('INFO', 'EMAIL', target.name, uid, `OK → ${r.email} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'EMAIL', target.name, uid, `FAILED → ${r.email}: ${e.message}`); }
                        }
                        sentTo.push({ name: r.name, phone: r.phone||'', email: r.email||'' });
                    }
                    fireIntegrations(
                        { _id: target._id, name: target.name, url: target.hostname },
                        'up',
                        target.userId?._id || target.userId,
                        null
                    ).catch(e => notifLog('ERROR', 'SYSTEM', target.name, uid, `fireIntegrations unhandled: ${e.message}`));
                    await Alert.create({
                        userId:     target.userId || null,
                        serverName: target.name,
                        serverUrl:  target.hostname,
                        type:       'recovered',
                        message:    `DNS resolved correctly again`,
                        sentTo,
                        source:     'ping',
                    }).catch(() => {});
                }
            }

            await DnsTarget.findByIdAndUpdate(target._id, {
                $set: setFields,
                $push: { history: { $each: [{ time: new Date(), responseTime: result.ms, status: result.alive ? 'up' : 'down' }], $slice: -1440 } },
            });
        }
    } catch (err) {
        console.error('[DNS] checkDnsTargets error:', err.message);
    }
}

// ── Check all UDP monitor targets ────────────────────────────────────────────
async function checkUdpTargets() {
    try {
        const settings   = await Settings.get();
        const targets    = await UdpTarget.find({ active: true }).populate('userId', 'plan trialEndsAt planEndsAt trialVerified');
        const recipients = await Recipient.find({ active: true }).populate('servers');

        for (const target of targets) {
            if (target.userId) {
                const u = target.userId;
                const plan = u.plan || 'free_trial';
                if (plan === 'free_trial') {
                    if (!u.trialVerified) continue;
                    if (u.trialEndsAt && new Date() > new Date(u.trialEndsAt)) continue;
                } else {
                    if (u.planEndsAt && new Date() > new Date(u.planEndsAt)) continue;
                }
            }
            if (target.userId) {
                const plan = target.userId.plan || 'free_trial';
                const pingInterval = plan === 'free_trial'
                    ? (settings.freeTrialPingInterval || 180)
                    : (settings.plans?.[plan]?.pingInterval || 60);
                const lastChecked = target.lastChecked ? new Date(target.lastChecked).getTime() : 0;
                if (lastChecked && (Date.now() - lastChecked) < pingInterval * 1000) continue;
            }

            const result = await udpCheck(target.host, target.port, target.payload, target.timeout, target.packetLossThreshold, target.expectedKeyword);
            const prevStatus = target.status;
            const wasAlertSent = target.downAlertSent;
            const uid = String(target.userId?._id || target.userId || '');

            console.log(`[UDP] ${target.name} (${target.host}:${target.port}) → ${result.alive ? 'UP' : 'DOWN'} | ${result.ms || '—'}ms`);

            const setFields = {
                lastChecked: new Date(),
                responseTime: result.ms,
                status: result.alive ? 'up' : 'down',
            };

            const getEligible = () => {
                if (!target.notifyRecipients || target.notifyRecipients.length === 0) return [];
                const ids = target.notifyRecipients.map(id => id.toString());
                return recipients.filter(r => ids.includes(r._id.toString()));
            };

            if (!result.alive) {
                if (prevStatus !== 'down') setFields.lastDownAt = new Date();
                if (prevStatus !== 'down' && !wasAlertSent) {
                    const eligible = getEligible();
                    const sentTo = [];
                    const waMsg = `🚨 *UDP Alert!*\n\n*Target:* ${target.name}\n*Host:* ${target.host}:${target.port}\n*Time:* ${now()}\n\nNo UDP response — service is *DOWN* ❌`;
                    for (const r of eligible) {
                        if (r.phone) {
                            try { await wa.sendMessage(r.phone, waMsg); notifLog('INFO', 'WHATSAPP', target.name, uid, `OK → ${r.phone} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'WHATSAPP', target.name, uid, `FAILED → ${r.phone}: ${e.message}`); }
                        }
                        if (r.email) {
                            try { await sendEmail(r.email, `[UptimeForge] UDP Service Down: ${target.name}`, pingDownEmailHtml(target.name, `${target.host}:${target.port}`, now())); notifLog('INFO', 'EMAIL', target.name, uid, `OK → ${r.email} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'EMAIL', target.name, uid, `FAILED → ${r.email}: ${e.message}`); }
                        }
                        sentTo.push({ name: r.name, phone: r.phone||'', email: r.email||'' });
                    }
                    fireIntegrations(
                        { _id: target._id, name: target.name, url: `${target.host}:${target.port}` },
                        'down',
                        target.userId?._id || target.userId,
                        null
                    ).catch(e => notifLog('ERROR', 'SYSTEM', target.name, uid, `fireIntegrations unhandled: ${e.message}`));
                    await Alert.create({
                        userId:     target.userId || null,
                        serverName: target.name,
                        serverUrl:  `${target.host}:${target.port}`,
                        type:       'down',
                        message:    `UDP service unresponsive`,
                        sentTo,
                        source:     'ping',
                    }).catch(() => {});
                    setFields.downAlertSent = true;
                }
            } else {
                if (prevStatus === 'down') {
                    setFields.lastUpAt = new Date();
                    setFields.downAlertSent = false;
                    const eligible = getEligible();
                    const sentTo = [];
                    const waMsg = `✅ *UDP Service Recovered!*\n\n*Target:* ${target.name}\n*Host:* ${target.host}:${target.port}\n*Time:* ${now()}\n\nService is responding again ✅`;
                    for (const r of eligible) {
                        if (r.phone) {
                            try { await wa.sendMessage(r.phone, waMsg); notifLog('INFO', 'WHATSAPP', target.name, uid, `OK → ${r.phone} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'WHATSAPP', target.name, uid, `FAILED → ${r.phone}: ${e.message}`); }
                        }
                        if (r.email) {
                            try { await sendEmail(r.email, `[UptimeForge] UDP Service Recovered: ${target.name}`, pingRecoveredEmailHtml(target.name, `${target.host}:${target.port}`, now())); notifLog('INFO', 'EMAIL', target.name, uid, `OK → ${r.email} (${r.name})`); }
                            catch (e) { notifLog('ERROR', 'EMAIL', target.name, uid, `FAILED → ${r.email}: ${e.message}`); }
                        }
                        sentTo.push({ name: r.name, phone: r.phone||'', email: r.email||'' });
                    }
                    fireIntegrations(
                        { _id: target._id, name: target.name, url: `${target.host}:${target.port}` },
                        'up',
                        target.userId?._id || target.userId,
                        null
                    ).catch(e => notifLog('ERROR', 'SYSTEM', target.name, uid, `fireIntegrations unhandled: ${e.message}`));
                    await Alert.create({
                        userId:     target.userId || null,
                        serverName: target.name,
                        serverUrl:  `${target.host}:${target.port}`,
                        type:       'recovered',
                        message:    `UDP service responding again`,
                        sentTo,
                        source:     'ping',
                    }).catch(() => {});
                }
            }

            await UdpTarget.findByIdAndUpdate(target._id, {
                $set: setFields,
                $push: { history: { $each: [{ time: new Date(), responseTime: result.ms, status: result.alive ? 'up' : 'down' }], $slice: -1440 } },
            });
        }
    } catch (err) {
        console.error('[UDP] checkUdpTargets error:', err.message);
    }
}

function start() {
    checkAll();
    checkExpiry();
    checkPingTargets();
    checkIcmpTargets();
    checkDnsTargets();
    checkUdpTargets();
    setInterval(checkAll, 30 * 1000);
    setInterval(checkExpiry, 6 * 60 * 60 * 1000);
    setInterval(checkPingTargets, 30 * 1000);
    setInterval(checkIcmpTargets, 30 * 1000);
    setInterval(checkDnsTargets, 30 * 1000);
    setInterval(checkUdpTargets, 30 * 1000);
    console.log('[Monitor] Started - ticker every 30s | Ping plan-based | Expiry check every 6h');

    // ── Report cron jobs ─────────────────────────────────────────────────────
    // Weekly: every Monday 8:00 AM IST (UTC+5:30 → 02:30 UTC)
    cron.schedule('30 2 * * 1', () => {
        console.log('[Report] Running weekly auto-generation...');
        require('../controllers/reportController').autoGenerate('weekly').catch(() => {});
    }, { timezone: 'Asia/Kolkata' });

    // Monthly: 1st of every month at 8:00 AM IST
    cron.schedule('0 8 1 * *', () => {
        console.log('[Report] Running monthly auto-generation...');
        require('../controllers/reportController').autoGenerate('monthly').catch(() => {});
    }, { timezone: 'Asia/Kolkata' });

    // Daily cleanup: keep only latest 50 incidents per user
    cron.schedule('0 1 * * *', async () => {
        try {
            const Alert = require('../models/Alert');
            const users = await Alert.distinct('userId');
            let total = 0;
            for (const userId of users) {
                const old = await Alert.find({ userId }).sort('-createdAt').skip(100).select('_id');
                if (old.length) {
                    const r = await Alert.deleteMany({ _id: { $in: old.map(a => a._id) } });
                    total += r.deletedCount;
                }
            }
            if (total > 0)
                console.log(`[Cleanup] Deleted ${total} excess incidents (kept 50 per user)`);
        } catch (e) {
            console.error('[Cleanup] Incident cleanup failed:', e.message);
        }
    }, { timezone: 'Asia/Kolkata' });
}

module.exports = { start, checkAll };
