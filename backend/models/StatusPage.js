const mongoose = require('mongoose');

const statusPageSchema = new mongoose.Schema({
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    monitors:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Server' }],
    isPublic:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('StatusPage', statusPageSchema);
