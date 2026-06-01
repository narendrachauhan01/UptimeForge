const mongoose = require('mongoose');

const pendingSchema = new mongoose.Schema({
    name:      { type: String, required: true },
    email:     { type: String, required: true, unique: true },
    phone:     { type: String, default: null },
    address:   { type: String, default: null },
    city:      { type: String, default: null },
    state:     { type: String, default: null },
    country:   { type: String, default: null },
    password:  { type: String, required: true },
    otp:        { type: String, required: true },
    otpExpiry:  { type: Date,   required: true },
    referredBy: { type: String, default: null },
    createdAt: { type: Date,   default: Date.now, expires: 600 },
});

module.exports = mongoose.model('PendingRegistration', pendingSchema);
