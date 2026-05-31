const mongoose = require('mongoose');

const deletedUserSchema = new mongoose.Schema({
    accountId:  { type: String },
    name:       { type: String },
    email:      { type: String },
    phone:      { type: String },
    plan:       { type: String },
    state:      { type: String },
    country:    { type: String },
    siteCount:  { type: Number, default: 0 },
    createdAt:  { type: Date },   // original account creation date
    deletedAt:  { type: Date, default: Date.now },
    deletedBy:  { type: String, default: 'admin' },
}, { timestamps: false });

module.exports = mongoose.model('DeletedUser', deletedUserSchema);
