const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    server:     { type: mongoose.Schema.Types.ObjectId, ref: 'Server' }, // null for ping alerts
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    serverName: { type: String },
    serverUrl:  { type: String },
    type:       { type: String, enum: ['down', 'recovered'], required: true },
    source:     { type: String, enum: ['monitor', 'ping'], default: 'monitor' },
    message:    { type: String },
    sentTo:     [{ name: String, phone: String, email: String }],
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
