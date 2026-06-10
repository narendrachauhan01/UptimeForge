const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    title:  { type: String, required: true, trim: true },
    body:   { type: String, default: '', trim: true },
    status: { type: String, enum: ['investigating', 'identified', 'monitoring', 'resolved'], default: 'investigating' },
    createdAt: { type: Date, default: Date.now },
}, { _id: true });

const statusPageSchema = new mongoose.Schema({
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    monitors:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Server' }],
    isPublic:    { type: Boolean, default: true },
    incidents:   [incidentSchema],
}, { timestamps: true });

module.exports = mongoose.model('StatusPage', statusPageSchema);
