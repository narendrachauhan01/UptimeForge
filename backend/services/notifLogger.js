const fs   = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');

function todayFile() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return path.join(LOG_DIR, `notifications-${yyyy}-${mm}-${dd}.log`);
}

function timestamp() {
    return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).replace(',', '');
}

/**
 * Write one log line.
 * @param {'INFO'|'WARN'|'ERROR'} level
 * @param {string} channel  — e.g. 'EMAIL', 'SLACK', 'TELEGRAM', 'DISCORD', 'ROCKETCHAT', 'WEBHOOK', 'WHATSAPP'
 * @param {string} server   — server/site name
 * @param {string} userId   — user's Mongo id
 * @param {string} message  — outcome message
 */
function notifLog(level, channel, server, userId, message) {
    const line = `[${timestamp()}] [${level.padEnd(5)}] [${channel.padEnd(10)}] ${server} (user:${userId}) → ${message}\n`;

    // Console mirror
    if (level === 'ERROR') console.error('[NotifLog]', line.trim());
    else if (level === 'WARN') console.warn('[NotifLog]', line.trim());
    else console.log('[NotifLog]', line.trim());

    // Append to today's file (non-blocking)
    fs.appendFile(todayFile(), line, () => {});
}

module.exports = { notifLog };
