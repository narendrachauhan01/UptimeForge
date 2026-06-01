const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const PERMISSIONS = [
    'dashboard', 'users', 'payments', 'planCanceling',
    'planSettings', 'annualPlans', 'featureAccess', 'infra',
    'integrationBackend', 'redisCache', 'deletedUsers', 'supportTickets',
];

const staffSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:    { type: String, required: true },
    permissions: { type: [String], enum: PERMISSIONS, default: [] },
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

staffSchema.statics.PERMISSIONS = PERMISSIONS;

module.exports = mongoose.model('StaffUser', staffSchema);
