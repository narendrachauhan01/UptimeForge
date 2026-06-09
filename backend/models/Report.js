const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:        { type: String, enum: ['weekly', 'monthly'], required: true },
    title:       { type: String },
    periodStart: { type: Date, required: true },
    periodEnd:   { type: Date, required: true },
    data:        { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
