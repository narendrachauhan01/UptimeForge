const mongoose = require('mongoose');

// Latest snapshot — one document per (userId, serverId), always upserted
const serverMetricSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serverId: { type: String, required: true },
    serverName: { type: String, required: true },
    hostname: { type: String },
    platform: { type: String },
    cpu: { type: Number },
    ramUsed: { type: Number },
    ramTotal: { type: Number },
    diskUsed: { type: Number },
    diskTotal: { type: Number },
    swapUsed: { type: Number },
    swapTotal: { type: Number },
    load1: { type: Number },
    load5: { type: Number },
    load15: { type: Number },
    uptime: { type: Number },
    cpuCores: { type: Number },
    cpuModel: { type: String },
    cpuArch: { type: String },
    cpuTemp: { type: Number },
    localIp: { type: String },
    publicIp: { type: String },
    users: { type: Number },
    uptimeStr: { type: String },
    networkRoutes: [{ network: String, dev: String, src: String, via: String, isDefault: Boolean }],
    activeSessions: [{ user: String, tty: String, from: String, loginTime: String, idle: String, what: String, active: Boolean }],
    lastSsh: [{ user: String, ip: String, time: String, active: Boolean }],
    timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

serverMetricSchema.index({ userId: 1, serverId: 1 }, { unique: true });
serverMetricSchema.index({ userId: 1 });

module.exports = mongoose.model('ServerMetric', serverMetricSchema);

// History — one document per metric push, auto-deleted after 2 hours
const serverMetricHistorySchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serverId:   { type: String, required: true },
    cpu:        { type: Number },
    ramUsed:    { type: Number },
    ramTotal:   { type: Number },
    diskUsed:   { type: Number },
    diskTotal:  { type: Number },
    timestamp:  { type: Date, default: Date.now },
}, { timestamps: false });

serverMetricHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7200 }); // 2 hours TTL
serverMetricHistorySchema.index({ userId: 1, serverId: 1, timestamp: -1 });

module.exports.ServerMetricHistory = mongoose.model('ServerMetricHistory', serverMetricHistorySchema);
