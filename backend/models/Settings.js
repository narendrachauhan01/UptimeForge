const mongoose = require('mongoose');

// Singleton document — only one settings record per app
const DEFAULT_FEATURES = {
    free_trial: [
        '2 sites monitored',
        'Email + WhatsApp alerts',
        'SSL & Domain expiry checks',
        '60s uptime checks',
        '5-day full access',
    ],
    bronze: [
        '5 sites monitored',
        'Email + WhatsApp alerts',
        'SSL & Domain tracking',
        'Performance charts',
        'Multi-recipient alerts',
    ],
    silver: [
        '15 sites monitored',
        'Email + WhatsApp alerts',
        'SSL & Domain tracking',
        'Full analytics & charts',
        'Server resource monitoring',
    ],
    gold: [
        '30 sites monitored',
        'Email + WhatsApp alerts',
        'SSL & Domain tracking',
        'Advanced analytics',
        'Priority support',
    ],
};

const settingsSchema = new mongoose.Schema({
    trialDays:         { type: Number, default: 5 },
    verificationFee:   { type: Number, default: 2 },
    freeTrialInterval: { type: Number, default: 300 }, // seconds — 5 min for free trial
    freeTrialFeatures: { type: [String], default: () => DEFAULT_FEATURES.free_trial },
    plans: {
        bronze: {
            price:    { type: Number, default: 499 },
            sites:    { type: Number, default: 5 },
            interval: { type: Number, default: 120 }, // 2 min
            label:    { type: String, default: 'Bronze' },
            features: { type: [String], default: () => DEFAULT_FEATURES.bronze },
        },
        silver: {
            price:    { type: Number, default: 999 },
            sites:    { type: Number, default: 15 },
            interval: { type: Number, default: 60 },  // 1 min
            label:    { type: String, default: 'Silver' },
            features: { type: [String], default: () => DEFAULT_FEATURES.silver },
        },
        gold: {
            price:    { type: Number, default: 1499 },
            sites:    { type: Number, default: 30 },
            interval: { type: Number, default: 60 },  // 1 min
            label:    { type: String, default: 'Gold' },
            features: { type: [String], default: () => DEFAULT_FEATURES.gold },
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
    // Backfill missing feature arrays on docs created before this field existed
    let dirty = false;
    if (!s.freeTrialFeatures || s.freeTrialFeatures.length === 0) {
        s.freeTrialFeatures = DEFAULT_FEATURES.free_trial;
        dirty = true;
    }
    for (const k of ['bronze', 'silver', 'gold']) {
        if (!s.plans[k].features || s.plans[k].features.length === 0) {
            s.plans[k].features = DEFAULT_FEATURES[k];
            dirty = true;
        }
    }
    if (dirty) { s.markModified('plans'); await s.save(); }
    return s;
};

settingsSchema.statics.update = async function (data) {
    let s = await this.findOne();
    if (!s) s = new this({});
    if (data.trialDays !== undefined) s.trialDays = data.trialDays;
    if (data.verificationFee !== undefined) s.verificationFee = data.verificationFee;
    if (data.freeTrialInterval !== undefined) s.freeTrialInterval = data.freeTrialInterval;
    if (data.freeTrialFeatures !== undefined) {
        const f = sanitizeFeatures(data.freeTrialFeatures);
        if (f) s.freeTrialFeatures = f;
    }
    if (data.plans) {
        for (const key of ['bronze', 'silver', 'gold']) {
            if (data.plans[key]) {
                if (data.plans[key].price    !== undefined) s.plans[key].price    = data.plans[key].price;
                if (data.plans[key].sites    !== undefined) s.plans[key].sites    = data.plans[key].sites;
                if (data.plans[key].interval !== undefined) s.plans[key].interval = data.plans[key].interval;
                if (data.plans[key].label    !== undefined) s.plans[key].label    = data.plans[key].label;
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
