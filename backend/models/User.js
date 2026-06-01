const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PLAN_LIMITS = { free_trial: 2, bronze: 5, silver: 15, gold: 30 };
const PLAN_PRICES = { bronze: 499, silver: 999, gold: 1499 }; // INR

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email:   { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:   { type: String, default: null, trim: true },
    address: { type: String, default: null, trim: true },
    city:    { type: String, default: null, trim: true },
    state:   { type: String, default: null, trim: true },
    country: { type: String, default: null, trim: true },
    password: { type: String, default: null },
    googleId:   { type: String, default: null },
    plan: { type: String, enum: ['free_trial', 'bronze', 'silver', 'gold'], default: 'free_trial' },
    billing: { type: String, enum: ['monthly', 'annually'], default: 'monthly' },
    planDuration: { type: String, enum: ['free_trial', '1m', '3m', '6m', '1y'], default: '1m' },
    trialEndsAt: { type: Date },
    planEndsAt: { type: Date },
    isBlocked: { type: Boolean, default: false },
    trialVerified: { type: Boolean, default: false },
    accountId: { type: String, unique: true, sparse: true },
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (this.isNew && !this.accountId) {
        // Generate UF-YYYY-XXXXX format
        const year = new Date().getFullYear();
        const rand = Math.floor(10000 + Math.random() * 90000);
        this.accountId = `UF-${year}-${rand}`;
    }
    if (this.isNew && !this.trialEndsAt) {
        this.trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    }
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 8);
    }
});

userSchema.methods.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.password);
};

userSchema.virtual('siteLimit').get(function () {
    return PLAN_LIMITS[this.plan] || 2;
});

userSchema.virtual('isActive').get(function () {
    if (this.isBlocked) return false;
    if (this.plan === 'free_trial') {
        // Active if trial not expired
        return !!(this.trialEndsAt && new Date() < this.trialEndsAt);
    }
    // Paid plan — active if planEndsAt is in future, or not set yet (just assigned)
    if (!this.planEndsAt) return true;
    return new Date() < new Date(this.planEndsAt);
});

userSchema.virtual('trialDaysLeft').get(function () {
    if (this.plan !== 'free_trial' || !this.trialEndsAt) return 0;
    return Math.max(0, Math.ceil((new Date(this.trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24)));
});

// accountStatus: 'active' | 'grace' | 'suspended'
// grace = expired but < 30 days ago, suspended = expired > 30 days ago
userSchema.virtual('accountStatus').get(function () {
    if (this.isBlocked) return 'suspended';
    const GRACE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
    const now = Date.now();
    let expiryDate = null;
    if (this.plan === 'free_trial') {
        expiryDate = this.trialEndsAt ? new Date(this.trialEndsAt) : null;
    } else {
        expiryDate = this.planEndsAt ? new Date(this.planEndsAt) : null;
    }
    if (!expiryDate) return 'active';
    if (now < expiryDate.getTime()) return 'active';
    if (now - expiryDate.getTime() < GRACE_MS) return 'grace';
    return 'suspended';
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
module.exports.PLAN_LIMITS = PLAN_LIMITS;
module.exports.PLAN_PRICES = PLAN_PRICES;
