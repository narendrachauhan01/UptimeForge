const mongoose = require('mongoose');

const serverMetricSchema = new mongoose.Schema({
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
    lastSsh: [{ user: String, ip: String, time: String, active: Boolean }],
    timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

serverMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });
serverMetricSchema.index({ serverId: 1, timestamp: -1 });

module.exports = mongoose.model('ServerMetric', serverMetricSchema);
