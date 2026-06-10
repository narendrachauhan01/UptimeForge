const mongoose = require('mongoose');

// Singleton document — only one settings record per app
const DEFAULT_FEATURES = {
    free_trial: [
        'ok:2 sites monitored',
        'limited:5 min check interval',
        'ok:Email alerts',
        'soon:WhatsApp alerts',
        'ok:Multi-recipient alerts',
        'no:SSL expiry monitoring',
        'no:Domain expiry monitoring',
        'no:Performance charts',
        'ok:Alert history logs',
    ],
    bronze: [
        'ok:5 sites monitored',
        'limited:2 min check interval',
        'ok:Email alerts',
        'soon:WhatsApp alerts',
        'ok:Multi-recipient alerts',
        'ok:SSL expiry monitoring',
        'ok:Domain expiry monitoring',
        'ok:Performance charts',
        'ok:Alert history logs',
    ],
    silver: [
        'ok:15 sites monitored',
        'ok:1 min check interval',
        'ok:Email alerts',
        'soon:WhatsApp alerts',
        'ok:Multi-recipient alerts',
        'ok:SSL expiry monitoring',
        'ok:Domain expiry monitoring',
        'ok:Performance charts',
        'ok:Alert history logs',
    ],
    gold: [
        'ok:30 sites monitored',
        'ok:30 sec check interval',
        'ok:Email alerts',
        'soon:WhatsApp alerts',
        'ok:Multi-recipient alerts',
        'ok:SSL expiry monitoring',
        'ok:Domain expiry monitoring',
        'ok:Performance charts',
        'ok:Alert history logs',
        'ok:Priority support',
    ],
};

const settingsSchema = new mongoose.Schema({
    trialDays:         { type: Number, default: 5 },
    verificationFee:   { type: Number, default: 2 },
    freeTrialSiteLimit:        { type: Number, default: 2 },
    freeTrialInterval:         { type: Number, default: 300 },
    freeTrialPingInterval:     { type: Number, default: 180 }, // 3 min
    freeTrialRecipientLimit:   { type: Number, default: 2 },
    freeTrialPingLimit:        { type: Number, default: 2 },
    freeTrialFeatures:         { type: [String], default: () => DEFAULT_FEATURES.free_trial },
    freeTrialAccess: {
        domainSsl:   { type: Boolean, default: false },
        charts:      { type: Boolean, default: false },
        pingMonitor: { type: Boolean, default: false },
        whatsapp:    { type: Boolean, default: false },
        telegram:    { type: Boolean, default: false },
        webhook:     { type: Boolean, default: false },
        rocketChat:  { type: Boolean, default: false },
        slack:       { type: Boolean, default: false },
        reports:     { type: Boolean, default: false },
    },
    bronzeAccess: {
        pingMonitor: { type: Boolean, default: false },
        whatsapp:    { type: Boolean, default: false },
        telegram:    { type: Boolean, default: false },
        webhook:     { type: Boolean, default: false },
        rocketChat:  { type: Boolean, default: false },
        slack:       { type: Boolean, default: false },
        reports:     { type: Boolean, default: false },
    },
    silverAccess: {
        pingMonitor: { type: Boolean, default: false },
        whatsapp:    { type: Boolean, default: false },
        telegram:    { type: Boolean, default: false },
        webhook:     { type: Boolean, default: false },
        rocketChat:  { type: Boolean, default: false },
        slack:       { type: Boolean, default: false },
        reports:     { type: Boolean, default: false },
    },
    goldAccess: {
        pingMonitor: { type: Boolean, default: false },
        whatsapp:    { type: Boolean, default: false },
        telegram:    { type: Boolean, default: false },
        webhook:     { type: Boolean, default: false },
        rocketChat:  { type: Boolean, default: false },
        slack:       { type: Boolean, default: false },
        reports:     { type: Boolean, default: false },
    },
    annualDiscount: { type: Number, default: 20 },
    annualPlans: {
        enabled:  { type: Boolean, default: true },
        bronze:   { price: { type: Number, default: 0 } },
        silver:   { price: { type: Number, default: 0 } },
        gold:     { price: { type: Number, default: 0 } },
    },
    customPlans: {
        threeMonth: {
            enabled: { type: Boolean, default: true },
            price:   { type: Number, default: 0 },
            label:   { type: String, default: '3 Month Plan' },
            features:{ type: [String], default: [] },
        },
        sixMonth: {
            enabled: { type: Boolean, default: true },
            price:   { type: Number, default: 0 },
            label:   { type: String, default: '6 Month Plan' },
            features:{ type: [String], default: [] },
        },
    },
    plans: {
        bronze: {
            price:           { type: Number, default: 499 },
            sites:           { type: Number, default: 5 },
            interval:        { type: Number, default: 120 },
            pingInterval:    { type: Number, default: 120 }, // 2 min
            pingLimit:       { type: Number, default: 5 },
            recipientLimit:  { type: Number, default: 10 },
            label:           { type: String, default: 'Bronze' },
            features:        { type: [String], default: () => DEFAULT_FEATURES.bronze },
        },
        silver: {
            price:           { type: Number, default: 999 },
            sites:           { type: Number, default: 15 },
            interval:        { type: Number, default: 60 },
            pingLimit:       { type: Number, default: 15 },
            pingInterval:    { type: Number, default: 60 }, // 1 min
            recipientLimit:  { type: Number, default: 20 },
            label:           { type: String, default: 'Silver' },
            features:        { type: [String], default: () => DEFAULT_FEATURES.silver },
        },
        gold: {
            price:           { type: Number, default: 1499 },
            sites:           { type: Number, default: 30 },
            interval:        { type: Number, default: 30 },
            pingInterval:    { type: Number, default: 30 }, // 30 sec
            pingLimit:       { type: Number, default: 30 },
            recipientLimit:  { type: Number, default: 30 },
            label:           { type: String, default: 'Gold' },
            features:        { type: [String], default: () => DEFAULT_FEATURES.gold },
        },
    },
}, { timestamps: true });

// Always return/update the single doc
function sanitizeFeatures(arr) {
    if (!Array.isArray(arr)) return undefined;
    return arr.map(s => String(s).trim()).filter(Boolean);
}

settingsSchema.statics.get = async function () {
    let s = await this.findOne();
    if (!s) s = await this.create({});
    // Backfill missing fields on docs created before these fields existed
    let dirty = false;
    // Backfill or migrate features to type-prefixed format (ok:/no:/limited:/soon:)
    const needsMigration = (arr) => !arr || arr.length === 0 || !arr[0].includes(':');
    if (needsMigration(s.freeTrialFeatures)) {
        s.freeTrialFeatures = DEFAULT_FEATURES.free_trial; dirty = true;
    }
    if (!s.freeTrialInterval)       { s.freeTrialInterval = 300;       dirty = true; }
    if (!s.freeTrialPingInterval)   { s.freeTrialPingInterval = 180;   dirty = true; }
    if (!s.freeTrialRecipientLimit) { s.freeTrialRecipientLimit = 2;   dirty = true; }
    if (!s.freeTrialAccess)         { s.freeTrialAccess = { domainSsl: false, charts: false, pingMonitor: false, whatsapp: false, telegram: false, webhook: false, rocketChat: false, slack: false, reports: false }; dirty = true; }
    if (s.freeTrialAccess && s.freeTrialAccess.pingMonitor === undefined) { s.freeTrialAccess.pingMonitor = false; s.markModified('freeTrialAccess'); dirty = true; }
    if (s.freeTrialAccess && s.freeTrialAccess.whatsapp   === undefined) { s.freeTrialAccess.whatsapp = false;   s.markModified('freeTrialAccess'); dirty = true; }
    if (s.freeTrialAccess && s.freeTrialAccess.telegram   === undefined) { s.freeTrialAccess.telegram = false;   s.markModified('freeTrialAccess'); dirty = true; }
    if (s.freeTrialAccess && s.freeTrialAccess.webhook    === undefined) { s.freeTrialAccess.webhook = false;    s.markModified('freeTrialAccess'); dirty = true; }
    if (s.freeTrialAccess && s.freeTrialAccess.rocketChat === undefined) { s.freeTrialAccess.rocketChat = false; s.markModified('freeTrialAccess'); dirty = true; }
    if (s.freeTrialAccess && s.freeTrialAccess.slack      === undefined) { s.freeTrialAccess.slack = false;      s.markModified('freeTrialAccess'); dirty = true; }
    if (!s.bronzeAccess) { s.bronzeAccess = { pingMonitor: false, whatsapp: false, telegram: false, webhook: false, rocketChat: false, slack: false, reports: false }; s.markModified('bronzeAccess'); dirty = true; }
    if (s.bronzeAccess && s.bronzeAccess.telegram    === undefined) { s.bronzeAccess.telegram    = false; s.markModified('bronzeAccess'); dirty = true; }
    if (s.bronzeAccess && s.bronzeAccess.pingMonitor === undefined) { s.bronzeAccess.pingMonitor = false; s.markModified('bronzeAccess'); dirty = true; }
    if (s.bronzeAccess && s.bronzeAccess.slack       === undefined) { s.bronzeAccess.slack       = false; s.markModified('bronzeAccess'); dirty = true; }
    if (!s.silverAccess) { s.silverAccess = { pingMonitor: false, whatsapp: false, telegram: false, webhook: false, rocketChat: false, slack: false, reports: false }; s.markModified('silverAccess'); dirty = true; }
    if (s.silverAccess && s.silverAccess.slack === undefined) { s.silverAccess.slack = false; s.markModified('silverAccess'); dirty = true; }
    if (!s.goldAccess)   { s.goldAccess   = { pingMonitor: false, whatsapp: false, telegram: false, webhook: false, rocketChat: false, slack: false, reports: false }; s.markModified('goldAccess');   dirty = true; }
    if (s.goldAccess && s.goldAccess.slack === undefined) { s.goldAccess.slack = false; s.markModified('goldAccess'); dirty = true; }
    for (const [key, obj] of [['freeTrialAccess', s.freeTrialAccess], ['bronzeAccess', s.bronzeAccess], ['silverAccess', s.silverAccess], ['goldAccess', s.goldAccess]]) {
        if (obj && obj.reports === undefined) { obj.reports = false; s.markModified(key); dirty = true; }
    }
    if (s.freeTrialPingLimit  === undefined) { s.freeTrialPingLimit  = 2; dirty = true; }
    if (s.freeTrialSiteLimit  === undefined) { s.freeTrialSiteLimit  = 2; dirty = true; }
    const DEFAULT_INTERVALS   = { bronze: 120, silver: 60,  gold: 30 };
    const DEFAULT_REC_LIMITS  = { bronze: 10,  silver: 20,  gold: 30 };
    const DEFAULT_PING_LIMITS = { bronze: 5,   silver: 15,  gold: 30 };
    for (const k of ['bronze', 'silver', 'gold']) {
        if (needsMigration(s.plans[k].features)) {
            s.plans[k].features = DEFAULT_FEATURES[k]; dirty = true;
        }
        if (!s.plans[k].interval)       { s.plans[k].interval = DEFAULT_INTERVALS[k];  dirty = true; }
        if (!s.plans[k].pingInterval)   { s.plans[k].pingInterval = DEFAULT_INTERVALS[k]; dirty = true; }
        if (!s.plans[k].recipientLimit) { s.plans[k].recipientLimit = DEFAULT_REC_LIMITS[k]; dirty = true; }
        if (!s.plans[k].pingLimit)      { s.plans[k].pingLimit = DEFAULT_PING_LIMITS[k]; dirty = true; }
    }
    if (dirty) { s.markModified('plans'); await s.save(); }
    return s;
};

settingsSchema.statics.update = async function (data) {
    let s = await this.findOne();
    if (!s) s = new this({});
    if (data.trialDays !== undefined)             s.trialDays = data.trialDays;
    if (data.verificationFee !== undefined)       s.verificationFee = data.verificationFee;
    if (data.freeTrialInterval !== undefined)     s.freeTrialInterval = data.freeTrialInterval;
    if (data.freeTrialPingInterval !== undefined) s.freeTrialPingInterval = data.freeTrialPingInterval;
    if (data.freeTrialRecipientLimit !== undefined) s.freeTrialRecipientLimit = data.freeTrialRecipientLimit;
    if (data.freeTrialPingLimit  !== undefined) s.freeTrialPingLimit  = Math.max(0, Number(data.freeTrialPingLimit)  || 0);
    if (data.freeTrialSiteLimit  !== undefined) s.freeTrialSiteLimit  = Math.max(0, Number(data.freeTrialSiteLimit)  || 0);
    if (data.freeTrialAccess !== undefined) {
        s.freeTrialAccess = { ...s.freeTrialAccess, ...data.freeTrialAccess };
        s.markModified('freeTrialAccess');
    }
    if (data.bronzeAccess !== undefined) {
        s.bronzeAccess = { ...s.bronzeAccess, ...data.bronzeAccess };
        s.markModified('bronzeAccess');
    }
    if (data.silverAccess !== undefined) {
        s.silverAccess = { ...s.silverAccess, ...data.silverAccess };
        s.markModified('silverAccess');
    }
    if (data.goldAccess !== undefined) {
        s.goldAccess = { ...s.goldAccess, ...data.goldAccess };
        s.markModified('goldAccess');
    }
    if (data.freeTrialFeatures !== undefined) {
        const f = sanitizeFeatures(data.freeTrialFeatures);
        if (f) s.freeTrialFeatures = f;
    }
    if (data.annualDiscount !== undefined) s.annualDiscount = Math.min(80, Math.max(0, Number(data.annualDiscount) || 0));
    if (data.annualPlans) {
        if (data.annualPlans.enabled !== undefined) s.annualPlans.enabled = !!data.annualPlans.enabled;
        for (const k of ['bronze', 'silver', 'gold']) {
            if (data.annualPlans[k]?.price !== undefined) s.annualPlans[k].price = Number(data.annualPlans[k].price) || 0;
        }
        s.markModified('annualPlans');
    }
    if (data.customPlans) {
        for (const k of ['threeMonth', 'sixMonth']) {
            if (data.customPlans[k]) {
                if (data.customPlans[k].enabled !== undefined) s.customPlans[k].enabled = !!data.customPlans[k].enabled;
                if (data.customPlans[k].price   !== undefined) s.customPlans[k].price   = Number(data.customPlans[k].price) || 0;
                if (data.customPlans[k].label   !== undefined) s.customPlans[k].label   = data.customPlans[k].label;
                if (data.customPlans[k].features !== undefined) {
                    const f = sanitizeFeatures(data.customPlans[k].features);
                    if (f) s.customPlans[k].features = f;
                }
            }
        }
        s.markModified('customPlans');
    }
    if (data.plans) {
        for (const key of ['bronze', 'silver', 'gold']) {
            if (data.plans[key]) {
                if (data.plans[key].price           !== undefined) s.plans[key].price          = data.plans[key].price;
                if (data.plans[key].sites           !== undefined) s.plans[key].sites          = data.plans[key].sites;
                if (data.plans[key].interval        !== undefined) s.plans[key].interval        = data.plans[key].interval;
                if (data.plans[key].pingInterval    !== undefined) s.plans[key].pingInterval    = data.plans[key].pingInterval;
                if (data.plans[key].pingLimit       !== undefined) s.plans[key].pingLimit       = data.plans[key].pingLimit;
                if (data.plans[key].recipientLimit  !== undefined) s.plans[key].recipientLimit  = data.plans[key].recipientLimit;
                if (data.plans[key].label           !== undefined) s.plans[key].label          = data.plans[key].label;
                if (data.plans[key].features !== undefined) {
                    const f = sanitizeFeatures(data.plans[key].features);
                    if (f) s.plans[key].features = f;
                }
            }
        }
        s.markModified('plans');
    }
    await s.save();
    return s;
};

module.exports = mongoose.model('Settings', settingsSchema);
