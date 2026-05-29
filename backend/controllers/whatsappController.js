const wa = require('../services/whatsapp');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ENV_PATH = path.join(__dirname, '../.env');

function updateEnv(key, value) {
    let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content += `\n${key}=${value}`;
    }
    fs.writeFileSync(ENV_PATH, content);
    process.env[key] = value;
}

async function testConnection(provider) {
    try {
        if (provider === 'greenapi') {
            const id = process.env.GREEN_API_INSTANCE;
            const token = process.env.GREEN_API_TOKEN;
            if (!id || !token) return { connected: false, reason: 'Not configured' };
            const state = await wa.getInstanceState();
            const connected = state?.stateInstance === 'authorized';
            return { connected, reason: connected ? 'Authorized' : (state?.stateInstance || 'Not authorized') };

        } else if (provider === 'twilio') {
            const sid = process.env.TWILIO_ACCOUNT_SID;
            const auth = process.env.TWILIO_AUTH_TOKEN;
            if (!sid || !auth) return { connected: false, reason: 'Not configured' };
            const creds = Buffer.from(`${sid}:${auth}`).toString('base64');
            const result = await new Promise((resolve) => {
                const req = https.get(
                    `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
                    { headers: { Authorization: `Basic ${creds}` } },
                    (res) => {
                        let d = '';
                        res.on('data', c => d += c);
                        res.on('end', () => resolve({ status: res.statusCode, data: d }));
                    }
                );
                req.on('error', () => resolve({ status: 500 }));
            });
            const connected = result.status === 200;
            return { connected, reason: connected ? 'Credentials verified' : 'Invalid credentials' };

        } else if (provider === 'aisensy') {
            const key = process.env.AISENSY_API_KEY;
            if (!key) return { connected: false, reason: 'Not configured' };
            return { connected: true, reason: 'API Key set' };
        }
    } catch (e) {
        return { connected: false, reason: e.message };
    }
    return { connected: false, reason: 'Unknown provider' };
}

// GET /api/whatsapp/status
exports.getStatus = async (req, res) => {
    const provider = process.env.WA_PROVIDER || 'greenapi';
    const { connected, reason } = await testConnection(provider);
    res.json({
        provider,
        connected,
        reason,
        status: connected ? 'ready' : 'not_configured',
        instanceId: process.env.GREEN_API_INSTANCE || '',
    });
};

// POST /api/whatsapp/config
exports.saveConfig = async (req, res) => {
    try {
        const { provider, instanceId, apiToken, accountSid, authToken, fromNumber, apiKey, apiUrl } = req.body;
        if (!provider) return res.status(400).json({ error: 'Provider required' });

        updateEnv('WA_PROVIDER', provider);

        if (provider === 'greenapi') {
            if (!instanceId || !apiToken) return res.status(400).json({ error: 'Instance ID and API Token required' });
            updateEnv('GREEN_API_INSTANCE', instanceId);
            updateEnv('GREEN_API_TOKEN', apiToken);
        } else if (provider === 'twilio') {
            if (!accountSid || !authToken || !fromNumber) return res.status(400).json({ error: 'Account SID, Auth Token and From Number required' });
            updateEnv('TWILIO_ACCOUNT_SID', accountSid);
            updateEnv('TWILIO_AUTH_TOKEN', authToken);
            updateEnv('TWILIO_WHATSAPP_FROM', fromNumber);
        } else if (provider === 'aisensy') {
            if (!apiKey) return res.status(400).json({ error: 'API Key required' });
            updateEnv('AISENSY_API_KEY', apiKey);
            if (apiUrl) updateEnv('AISENSY_API_URL', apiUrl);
        }

        const { connected, reason } = await testConnection(provider);
        res.json({ success: true, provider, connected, reason });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /api/whatsapp/reset
exports.reset = (req, res) => {
    try {
        ['WA_PROVIDER','GREEN_API_INSTANCE','GREEN_API_TOKEN','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM','AISENSY_API_KEY'].forEach(k => updateEnv(k, ''));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/whatsapp/test
exports.testSend = async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    try {
        await wa.sendMessage(phone, '✅ UptimeForge WhatsApp test — connected successfully!');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
