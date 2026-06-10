const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema({
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, enum: ['slack','discord','telegram','webhook','rocketchat'], required: true },
    config:  { type: Object, default: {} },
    events:  { type: String, enum: ['all','down','down_ssl'], default: 'all' },
    servers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Server' }], // empty = all servers
    active:  { type: Boolean, default: true },
}, { timestamps: true });

integrationSchema.index({ userId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Integration', integrationSchema);
