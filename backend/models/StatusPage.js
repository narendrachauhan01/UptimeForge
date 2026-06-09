const mongoose = require('mongoose');

const statusPageSchema = new mongoose.Schema({
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    monitors:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Server' }],
    pingTargets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PingTarget' }],
    isPublic:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('StatusPage', statusPageSchema);
