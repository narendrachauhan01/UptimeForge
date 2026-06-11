const Alert        = require('../models/Alert');
const Notification = require('../models/Notification');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function runCleanup() {
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
    try {
        const [alerts, notifs] = await Promise.all([
            Alert.deleteMany({ createdAt: { $lt: cutoff } }),
            Notification.deleteMany({ createdAt: { $lt: cutoff } }),
        ]);
        console.log(`[Cleanup] Deleted ${alerts.deletedCount} alerts, ${notifs.deletedCount} notifications older than 30 days`);
    } catch (e) {
        console.error('[Cleanup] Error:', e.message);
    }
}

function startCleanup() {
    // Run once at startup (catches any backlog)
    runCleanup();

    // Then run daily at 2:00 AM
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
