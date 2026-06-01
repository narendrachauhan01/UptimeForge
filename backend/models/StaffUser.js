const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// Permissions stored as "key:access" e.g. "users:read", "users:write"
const SECTIONS = [
    'dashboard', 'users', 'payments', 'planCanceling',
    'planSettings', 'annualPlans', 'featureAccess', 'infra',
    'integrationBackend', 'redisCache', 'deletedUsers', 'supportTickets',
];

const staffSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:    { type: String, required: true },
    permissions: { type: [String], default: [] }, // format: "section:read" or "section:write"
    isActive:    { type: Boolean, default: true },
}, { timestamps: true });

staffSchema.pre('save', async function () {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

staffSchema.methods.checkPassword = function (plain) {
    return bcrypt.compare(plain, this.password);
};

// Helper: check if has read or write access to a section
staffSchema.methods.can = function (section, access = 'read') {
    return this.permissions.includes(`${section}:${access}`) ||
           (access === 'read' && this.permissions.includes(`${section}:write`));
};

staffSchema.statics.SECTIONS = SECTIONS;

module.exports = mongoose.model('StaffUser', staffSchema);
