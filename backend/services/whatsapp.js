const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');

const SESSION_PATH = '/home/addweb/server-monitor/.ww-session';

// Clear stale Chrome lock files on startup to prevent "browser already running" error
try {
    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
    const sessionDir = `${SESSION_PATH}/session`;
    lockFiles.forEach(f => {
        const p = `${sessionDir}/${f}`;
        if (fs.existsSync(p)) { fs.unlinkSync(p); }
    });
} catch (_) {}

// Patch inject() to survive frame detach during WA's QR→main page navigation.
// The framenavigated handler in Client.js will re-call inject() on the new frame anyway.
const _origInject = Client.prototype.inject;
Client.prototype.inject = async function () {
    try {
        return await _origInject.call(this);
    } catch (e) {
        const isFrameErr = e?.message && (
            e.message.includes('detached') ||
            e.message.includes('Frame') ||
            e.message.includes('Execution context')
        );
        if (isFrameErr) {
            console.log('[WhatsApp] Frame changed during inject — waiting for framenavigated to retry');
            return; // framenavigated handler will call inject() again on the new frame
        }
        throw e;
    }
};

let client = null;
let waStatus = 'disconnected';
let qrDataUrl = null;
let io = null;
let isConnecting = false;

function init(socketIo) {
    io = socketIo;
    connect();
}

async function destroyClient() {
    if (!client) return;
    try { await client.destroy(); } catch (_) {}
    client = null;
}

async function connect() {
    if (isConnecting) return;
    isConnecting = true;

    await destroyClient();
    waStatus = 'connecting';

    client = new Client({
        authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
        puppeteer: {
            executablePath: '/usr/bin/google-chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--window-size=1280,720',
            ],
            headless: true,
        }
    });

    client.on('qr', async (qr) => {
        waStatus = 'qr';
        qrDataUrl = await qrcode.toDataURL(qr);
        emit('wa:status', { status: 'qr', qr: qrDataUrl });
        console.log('[WhatsApp] QR generated — scan now');
    });

    client.on('ready', () => {
        waStatus = 'ready';
        qrDataUrl = null;
        isConnecting = false;
        emit('wa:status', { status: 'ready' });
        console.log('[WhatsApp] Ready');
    });

    client.on('auth_failure', async () => {
        waStatus = 'disconnected';
        isConnecting = false;
        emit('wa:status', { status: 'disconnected' });
        console.log('[WhatsApp] Auth failed — clearing session');
        const fs = require('fs');
        try { fs.rmSync(SESSION_PATH, { recursive: true, force: true }); } catch (_) {}
        setTimeout(connect, 5000);
    });

    client.on('disconnected', () => {
        waStatus = 'disconnected';
        isConnecting = false;
        emit('wa:status', { status: 'disconnected' });
        console.log('[WhatsApp] Disconnected, reconnecting in 15s...');
        setTimeout(connect, 15000);
    });

    client.initialize().catch(async (err) => {
        console.error('[WhatsApp] Init error, retrying in 30s:', err.message);
        waStatus = 'disconnected';
        isConnecting = false;
        emit('wa:status', { status: 'disconnected' });
        await destroyClient();
        setTimeout(connect, 30000);
    });
}

function emit(event, data) {
    if (io) io.emit(event, data);
}

async function sendMessage(phone, message) {
    if (waStatus !== 'ready') throw new Error('WhatsApp not ready');
    const chatId = phone.replace(/\D/g, '') + '@c.us';
    await client.sendMessage(chatId, message);
}

function getStatus() {
    return { status: waStatus, qr: qrDataUrl };
}

module.exports = { init, sendMessage, getStatus };
