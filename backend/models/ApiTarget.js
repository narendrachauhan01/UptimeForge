const mongoose = require('mongoose');

const apiTargetSchema = new mongoose.Schema({
    name:               { type: String, required: true },
    url:                { type: String, required: true },
    httpMethod:         { type: String, enum: ['GET','POST','PUT','PATCH','DELETE','HEAD'], default: 'GET' },
    requestHeaders:     [{ key: String, value: String }],
    requestBody:        { type: String, default: '' },

    // Assertions — checked against the JSON response body
    assertions: [{
        property:   { type: String, required: true },   // JSONPath, e.g. $.data.status
        comparison: { type: String, enum: ['equals','not_equals','contains','greater_than','less_than','exists','not_exists'], default: 'equals' },
        target:     { type: String, default: '' },
    }],
    assertionLogic: { type: String, enum: ['AND','OR'], default: 'AND' },

    // Advanced settings
    timeout:               { type: Number, default: 30 },    // seconds
    ipVersion:             { type: String, enum: ['ipv4_priority','ipv6_priority','ipv4_only','ipv6_only'], default: 'ipv4_priority' },
    followRedirects:       { type: Boolean, default: true },
    upStatusCodes:         { type: [String], default: ['2xx','3xx'] },
    slowResponseAlert:     { type: Boolean, default: false },
    slowResponseThreshold: { type: Number, default: null },  // ms

    active:        { type: Boolean, default: true },
    status:        { type: String, enum: ['up','down','unknown'], default: 'unknown' },
    lastChecked:   { type: Date },
    responseTime:  { type: Number },
    lastStatusCode:{ type: Number },
    lastDownAt:    { type: Date },
    lastUpAt:      { type: Date },
    downAlertSent:     { type: Boolean, default: false },
    slowAlertSent:     { type: Boolean, default: false },
    notifyRecipients:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipient' }], // empty = all
    userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    history: [{
        time:         { type: Date },
        responseTime: { type: Number },
        status:       { type: String },
    }],
}, { timestamps: true });

module.exports = mongoose.model('ApiTarget', apiTargetSchema);
