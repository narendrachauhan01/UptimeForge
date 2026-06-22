const mongoose = require('mongoose');

const dnsTargetSchema = new mongoose.Schema({
    name:          { type: String, required: true },
    hostname:      { type: String, required: true }, // domain to query, e.g. example.com
    recordType:    { type: String, enum: ['A','AAAA','CNAME','MX','TXT','SPF','NS','SOA','PTR','SRV'], default: 'A' },
    expectedValue: { type: String, default: '' }, // blank = just verify it resolves
    dnsServer:     { type: String, default: '' }, // blank = system default resolver
    active:        { type: Boolean, default: true },
    status:        { type: String, enum: ['up','down','unknown'], default: 'unknown' },
    lastChecked:   { type: Date },
    responseTime:  { type: Number },
    resolvedValues:[{ type: String }],
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

module.exports = mongoose.model('DnsTarget', dnsTargetSchema);
