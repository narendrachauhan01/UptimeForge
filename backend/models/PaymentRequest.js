const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName:  { type: String },
    userEmail: { type: String },
    type:      { type: String, enum: ['plan', 'verification'], default: 'plan' },
    plan:      { type: String, enum: ['bronze', 'silver', 'gold', null], default: null },
    billing:   { type: String, enum: ['monthly', 'annually', null], default: null },
    startDate: { type: Date, default: null },
    amount:    { type: Number, required: true },
    utr:       { type: String, required: true, trim: true },
    status:    { type: String, enum: ['pending', 'approved', 'rejected', 'refunded', 'cancelled'], default: 'pending' },
    razorpay_payment_id: { type: String, default: '' },
    razorpay_refund_id:  { type: String, default: '' },
    refundStatus:        { type: String, default: '' },
    adminNote:  { type: String, default: '' },
    reviewedAt: { type: Date },
    planEndsAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
