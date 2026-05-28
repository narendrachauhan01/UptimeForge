const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    checkInterval: { type: Number, default: 60 },
    active: { type: Boolean, default: true },
    status: { type: String, enum: ['up', 'down', 'unknown'], default: 'unknown' },
    lastChecked: { type: Date },
    lastDownAt: { type: Date },
    lastUpAt: { type: Date },
    responseTime: { type: Number },
    httpCode: { type: Number },
    history: [{
        time: { type: Date },
        responseTime: { type: Number },
        status: { type: String },
        httpCode: { type: Number },
    }],
    sslExpiry: { type: Date },
    sslDaysLeft: { type: Number },
    domainExpiry: { type: Date },
    downAlertSent: { type: Boolean, default: false },
    userId: { type: require('mongoose').Schema.Types.ObjectId, ref: 'User', default: null },
    // Advanced settings
    timeout:         { type: Number, default: 10 },           // seconds
    followRedirects: { type: Boolean, default: true },
    httpMethod:      { type: String, default: 'GET' },
    upCodes:         { type: [Number], default: [200, 301, 302] },
}, { timestamps: true });

module.exports = mongoose.model('Server', serverSchema);
