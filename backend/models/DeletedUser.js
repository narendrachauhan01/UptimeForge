const mongoose = require('mongoose');

const deletedUserSchema = new mongoose.Schema({
    // Basic info
    accountId:  { type: String },
    name:       { type: String },
    email:      { type: String },
    phone:      { type: String },
    address:    { type: String },
    plan:       { type: String },
    billing:    { type: String },
    planEndsAt: { type: Date },
    state:      { type: String },
    country:    { type: String },
    // Stats
    siteCount:      { type: Number, default: 0 },
    totalPaid:      { type: Number, default: 0 },
    // Archived data for reference
    sites:          { type: Array, default: [] },   // [{name, url, createdAt}]
    pingTargets:    { type: Array, default: [] },   // [{name, host, port}]
    payments:       { type: Array, default: [] },   // [{amount, type, plan, date, utr}]
    // Meta
    createdAt:  { type: Date },
    deletedAt:  { type: Date, default: Date.now },
    deletedBy:  { type: String, default: 'admin' },
}, { timestamps: false });

module.exports = mongoose.model('DeletedUser', deletedUserSchema);
