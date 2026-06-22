const mongoose = require('mongoose');

const udpTargetSchema = new mongoose.Schema({
    name:          { type: String, required: true },
    host:          { type: String, required: true },
    port:          { type: Number, required: true },
    payload:             { type: String, default: 'ping' },   // data sent in the UDP probe packet
    timeout:             { type: Number, default: 30 },       // seconds to wait for a response
    expectedKeyword:     { type: String, default: '' },       // blank = don't check response content
    packetLossThreshold: { type: Number, default: 5 },        // % packet loss allowed before marking DOWN
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

module.exports = mongoose.model('UdpTarget', udpTargetSchema);
