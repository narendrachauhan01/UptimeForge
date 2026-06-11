const fs   = require('fs');
const path = require('path');

const Alert        = require('../models/Alert');
const Notification = require('../models/Notification');

const THIRTY_DAYS_MS  = 30 * 24 * 60 * 60 * 1000;
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const LOG_DIR = path.join(__dirname, '../logs');

function purgeOldLogs() {
    try {
        if (!fs.existsSync(LOG_DIR)) return;
        const cutoff = Date.now() - FIFTEEN_DAYS_MS;
        const files = fs.readdirSync(LOG_DIR).filter(f => f.startsWith('notifications-') && f.endsWith('.log'));
        let deleted = 0;
        for (const f of files) {
            const fp = path.join(LOG_DIR, f);
            const stat = fs.statSync(fp);
            if (stat.mtimeMs < cutoff) {
                fs.unlinkSync(fp);
                deleted++;
            }
        }
        if (deleted > 0) console.log(`[Cleanup] Deleted ${deleted} log file(s) older than 15 days`);
    } catch (e) {
        console.error('[Cleanup] Log purge error:', e.message);
    }
}

async function runCleanup() {
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
    try {
        const [alerts, notifs] = await Promise.all([
            Alert.deleteMany({ createdAt: { $lt: cutoff } }),
            Notification.deleteMany({ createdAt: { $lt: cutoff } }),
        ]);
        console.log(`[Cleanup] Deleted ${alerts.deletedCount} alerts, ${notifs.deletedCount} notifications older than 30 days`);
    } catch (e) {
        console.error('[Cleanup] DB error:', e.message);
    }
    purgeOldLogs();
}

function startCleanup() {
    runCleanup();

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const now = new Date();
    const next2AM = new Date(now);
    next2AM.setHours(2, 0, 0, 0);
    if (next2AM <= now) next2AM.setDate(next2AM.getDate() + 1);
    const msUntil2AM = next2AM - now;

    setTimeout(() => {
        runCleanup();
        setInterval(runCleanup, MS_PER_DAY);
    }, msUntil2AM);

    console.log(`[Cleanup] Scheduled daily at 2 AM (next run in ${Math.round(msUntil2AM / 3600000)}h)`);
}

module.exports = { startCleanup };
