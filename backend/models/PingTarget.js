const mongoose = require('mongoose');

const pingTargetSchema = new mongoose.Schema({
    name:          { type: String, required: true },
    host:          { type: String, required: true },
    port:          { type: Number, default: 80 },
    active:        { type: Boolean, default: true },
    status:        { type: String, enum: ['up','down','unknown'], default: 'unknown' },
    lastChecked:   { type: Date },
    responseTime:  { type: Number },
    lastDownAt:    { type: Date },
    lastUpAt:      { type: Date },
    downAlertSent:     { type: Boolean, default: false },
    notifyRecipients:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipient' }], // empty = all
    userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    history: [{
        time:         { type: Date },
        responseTime: { type: Number },
        status:       { type: String },
    }],
}, { timestamps: true });

module.exports = mongoose.model('PingTarget', pingTargetSchema);
