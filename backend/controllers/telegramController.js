const crypto = require('crypto');
const axios = require('axios');
const Integration = require('../models/Integration');

const BOT_TOKEN    = () => process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = () => process.env.TELEGRAM_BOT_USERNAME || 'uptimeforge_bot';
const LINK_TTL_MS  = 15 * 60 * 1000;

function send(chatId, text) {
    const token = BOT_TOKEN();
    if (!token) return;
    axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId, text, parse_mode: 'Markdown',
    }, { timeout: 10000 }).catch(() => {});
}

// POST /api/integrations/telegram/connect — generates a one-time deep link to start the shared bot
exports.connect = async (req, res) => {
    try {
        const code = crypto.randomBytes(4).toString('hex');
        await Integration.findOneAndUpdate(
            { userId: req.userId, type: 'telegram' },
            { config: { linkCode: code, linkExpires: new Date(Date.now() + LINK_TTL_MS) }, active: false },
            { upsert: true, new: true }
        );
        res.json({ link: `https://t.me/${BOT_USERNAME()}?start=${code}`, expiresInMinutes: LINK_TTL_MS / 60000 });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/integrations/telegram/status — is this user's chat connected to the shared bot?
exports.status = async (req, res) => {
    try {
        const intg = await Integration.findOne({ userId: req.userId, type: 'telegram' });
        res.json({ connected: !!(intg?.active && intg?.config?.chatId) });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/integrations/telegram/test — send a test alert to the connected chat via the shared bot
exports.test = async (req, res) => {
    try {
        const intg = await Integration.findOne({ userId: req.userId, type: 'telegram', active: true });
        if (!intg?.config?.chatId) return res.status(400).json({ error: 'Connect Telegram first' });
        const token = BOT_TOKEN();
        if (!token) return res.status(500).json({ error: 'Telegram bot is not configured on the server' });

        const r = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: intg.config.chatId,
            text: '🚨 *UptimeForge Test*\nYour Telegram alerts are working! You will get messages here when your sites go down or recover.',
            parse_mode: 'Markdown',
        }, { timeout: 10000 });

        if (r.data?.ok) return res.json({ success: true });
        return res.status(400).json({ error: r.data?.description || 'Telegram rejected the request' });
    } catch (e) {
        return res.status(400).json({ error: e.response?.data?.description || e.message });
    }
};

// POST /api/integrations/telegram/settings — update events/site filters without touching the linked chat
exports.updateSettings = async (req, res) => {
    try {
        const { events, servers } = req.body;
        const doc = await Integration.findOneAndUpdate(
            { userId: req.userId, type: 'telegram', active: true },
            { events: events || 'all', servers: servers || [] },
            { new: true }
        );
        if (!doc) return res.status(404).json({ error: 'Connect Telegram first' });
        res.json(doc);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/telegram/webhook — public endpoint Telegram calls with incoming bot updates
exports.webhook = async (req, res) => {
    if (process.env.TELEGRAM_WEBHOOK_SECRET) {
        const got = req.headers['x-telegram-bot-api-secret-token'];
        if (got !== process.env.TELEGRAM_WEBHOOK_SECRET) return res.sendStatus(403);
    }
    res.sendStatus(200); // ack immediately — Telegram retries on non-2xx

    try {
        const msg = req.body?.message;
        const text = msg?.text?.trim();
        const chatId = msg?.chat?.id;
        if (!text || !chatId) return;

        const m = text.match(/^\/start(?:@\w+)?(?:\s+(\S+))?/i);
        if (!m) return;
        const code = m[1];

        if (!code) {
            send(chatId, 'Hi 👋 To connect this chat to your UptimeForge account, go to your dashboard → *Integrations* → *Telegram* → *Connect with Telegram*. That button will bring you back here with a special link.');
            return;
        }

        const intg = await Integration.findOne({
            type: 'telegram',
            'config.linkCode': code,
            'config.linkExpires': { $gt: new Date() },
        });

        if (!intg) {
            send(chatId, '⚠️ This link has expired or is invalid. Please generate a new one from your UptimeForge dashboard (Integrations → Telegram → Connect with Telegram).');
            return;
        }

        intg.config = { chatId };
        intg.active = true;
        await intg.save();

        send(chatId, '✅ *Connected!*\nThis chat is now linked to your UptimeForge account. You will receive alerts here whenever your monitored sites go down or come back up.');
    } catch (_) {}
};
