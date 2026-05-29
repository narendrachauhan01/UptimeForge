const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');
const PaymentRequest = require('../models/PaymentRequest');
const { sendEmail } = require('../services/email');

const PLAN_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', free_trial: 'Free Trial' };

function getRzp() {
    return new Razorpay({
        key_id:     process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

function userPayload(u) {
    return {
        id: u._id, name: u.name, email: u.email,
        plan: u.plan, trialEndsAt: u.trialEndsAt, planEndsAt: u.planEndsAt,
        siteLimit: u.siteLimit, isActive: u.isActive,
        trialDaysLeft: u.trialDaysLeft, isBlocked: u.isBlocked,
        trialVerified: u.trialVerified ?? true,
    };
}

function receiptHtml(user, plan, amount, paymentId, planEndsAt) {
    const isVerification = plan === 'verification';
    const planName = isVerification ? 'Free Trial (5 days)' : (PLAN_LABEL[plan] || plan);
    const accent   = isVerification ? '#7c3aed' : '#059669';
    const bg       = isVerification ? '#f5f3ff' : '#f0fdf4';
    const border   = isVerification ? '#c4b5fd' : '#bbf7d0';
    const expiryStr = planEndsAt
        ? new Date(planEndsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—';
    return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">
      <div style="background:linear-gradient(135deg,${accent},${accent}cc);padding:32px;text-align:center">
        <div style="font-size:48px;margin-bottom:8px">${isVerification ? '🎉' : '✅'}</div>
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">${isVerification ? 'Trial Activated!' : 'Plan Activated!'}</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">UptimeForge</p>
      </div>
      <div style="padding:32px">
        <p style="color:#475569;font-size:15px;margin:0 0 20px">
          Hi <strong style="color:#0f172a">${user.name}</strong>,
          ${isVerification
            ? 'your ₹2 verification is confirmed. Your <strong>5-day free trial</strong> is now active!'
            : `your payment is confirmed. Your <strong>${planName} plan</strong> is now active!`}
        </p>
        <div style="background:${bg};border:1px solid ${border};border-radius:14px;padding:20px;margin-bottom:20px">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Plan</td><td style="padding:6px 0;font-weight:700;color:#1e293b;text-align:right">${planName}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Amount Paid</td><td style="padding:6px 0;font-weight:700;color:${accent};text-align:right">₹${amount}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Payment ID</td><td style="padding:6px 0;font-weight:700;color:#1e293b;text-align:right;font-family:monospace;font-size:12px">${paymentId}</td></tr>
            ${!isVerification ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">Valid Until</td><td style="padding:6px 0;font-weight:700;color:#1e293b;text-align:right">${expiryStr}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Account</td><td style="padding:6px 0;font-weight:700;color:#1e293b;text-align:right">${user.email}</td></tr>
          </table>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin:0;text-align:center">Keep this email as your payment receipt · Powered by Razorpay</p>
      </div>
      <div style="padding:16px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
        UptimeForge &mdash; &copy; 2026 Narendra Singh
      </div>
    </div>`;
}

// GET /api/payment/plans
exports.getPlans = async (req, res) => {
    try {
        const settings = await Settings.get();
        res.json({
            plans: settings.plans,
            verificationFee: settings.verificationFee || 2,
            trialDays: settings.trialDays || 5,
            freeTrialFeatures: settings.freeTrialFeatures || [],
            freeTrialAccess: settings.freeTrialAccess || { domainSsl: true, charts: true },
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /api/payment/create-order
exports.createOrder = async (req, res) => {
    if (req.isAdmin) return res.status(400).json({ error: 'Admin does not need a plan' });
    try {
        const { plan } = req.body;
        const settings  = await Settings.get();
        const user      = await User.findById(req.userId);

        let amountPaise, description;

        if (plan === 'verification') {
            if (user.trialVerified) return res.status(400).json({ error: 'Account already verified' });
            amountPaise = (settings.verificationFee || 2) * 100;
            description = 'Free Trial Verification';
        } else if (['bronze', 'silver', 'gold'].includes(plan)) {
            const cfg = settings.plans[plan];
            if (!cfg) return res.status(400).json({ error: 'Plan not configured' });
            amountPaise = cfg.price * 100;
            description = `${PLAN_LABEL[plan]} Plan — Monthly`;
        } else {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        const rzp   = getRzp();
        const receipt = `r_${user._id.toString().slice(-12)}_${Date.now().toString(36)}`;
        const order = await rzp.orders.create({
            amount:   amountPaise,
            currency: 'INR',
            receipt,
            notes:    { userId: user._id.toString(), plan, userName: user.name, userEmail: user.email },
        });

        res.json({
            orderId:  order.id,
            amount:   order.amount,
            currency: order.currency,
            keyId:    process.env.RAZORPAY_KEY_ID,
            prefill:  { name: user.name, email: user.email, contact: user.phone || '' },
        });
    } catch (e) {
        console.error('[Payment] create-order failed:', e?.error || e);
        const msg = e?.error?.description || e?.message || 'Could not create payment order';
        res.status(500).json({ error: msg });
    }
};

// POST /api/payment/verify
exports.verifyPayment = async (req, res) => {
    if (req.isAdmin) return res.status(400).json({ error: 'Not applicable for admin' });
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expected !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed — invalid signature.' });
        }

        const user     = await User.findById(req.userId);
        const settings = await Settings.get();
        let amount = 0, planEndsAt = null;

        if (plan === 'verification') {
            if (user.trialVerified) return res.status(400).json({ error: 'Account already verified' });
            amount = settings.verificationFee || 2;
            user.trialVerified = true;
        } else if (['bronze', 'silver', 'gold'].includes(plan)) {
            const cfg = settings.plans[plan];
            amount = cfg?.price || 0;
            const now        = new Date();
            const currentEnd = user.planEndsAt && user.planEndsAt > now ? user.planEndsAt : now;
            const newEnd     = new Date(currentEnd);
            newEnd.setMonth(newEnd.getMonth() + 1);
            user.plan        = plan;
            user.planEndsAt  = newEnd;
            user.trialVerified = true;
            planEndsAt = newEnd;
        } else {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        await user.save();

        await PaymentRequest.create({
            userId:    user._id,
            userName:  user.name,
            userEmail: user.email,
            type:      plan === 'verification' ? 'verification' : 'plan',
            plan:      plan === 'verification' ? null : plan,
            amount,
            utr:       razorpay_payment_id,
            razorpay_payment_id,
            status:    'approved',
            reviewedAt: new Date(),
            planEndsAt,
        });

        sendEmail(
            user.email,
            plan === 'verification'
                ? 'Trial Activated — UptimeForge'
                : `${PLAN_LABEL[plan]} Plan Activated — UptimeForge`,
            receiptHtml(user, plan, amount, razorpay_payment_id, planEndsAt)
        ).catch(() => {});

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, token, user: userPayload(user) });
    } catch (e) {
        console.error('[Payment] verify failed:', e?.error || e);
        const msg = e?.error?.description || e?.message || 'Payment verification failed';
        res.status(500).json({ error: msg });
    }
};

// POST /api/payment/:id/refund  — Admin initiates refund via Razorpay API
exports.refundPayment = async (req, res) => {
    try {
        const pr = await PaymentRequest.findById(req.params.id);
        if (!pr) return res.status(404).json({ error: 'Payment not found' });
        if (pr.status === 'refunded') return res.status(400).json({ error: 'Already refunded' });
        if (pr.status !== 'approved') return res.status(400).json({ error: 'Only approved payments can be refunded' });

        const rzp = getRzp();
        const paymentId = pr.razorpay_payment_id || pr.utr;

        // Initiate refund via Razorpay API
        const refund = await rzp.payments.refund(paymentId, { amount: pr.amount * 100, speed: 'normal' });
        console.log(`[Refund] Initiated: ${refund.id} for payment ${paymentId}`);

        // Revert user plan
        const user = await User.findById(pr.userId);
        const prevPlan = user?.plan;
        if (user) {
            user.plan = 'free_trial';
            user.planEndsAt = null;
            await user.save();
        }

        // Update payment record
        pr.status   = 'refunded';
        pr.adminNote = `Refunded by admin. Razorpay refund ID: ${refund.id}`;
        pr.reviewedAt = new Date();
        await pr.save();

        console.log(`[Refund] User ${user?.email} reverted ${prevPlan} → free_trial`);

        // Notify user
        try {
            await sendEmail(user.email, 'Your UptimeForge Refund has been Initiated',
                `<div style="font-family:Inter,sans-serif;padding:32px;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #fecdd3">
                    <div style="text-align:center;font-size:48px;margin-bottom:8px">💸</div>
                    <h2 style="color:#dc2626;text-align:center;margin-bottom:4px">Refund Initiated</h2>
                    <p style="color:#64748b;text-align:center;font-size:14px;margin-bottom:24px">Your payment has been refunded successfully</p>
                    <p>Hi <strong>${user.name}</strong>,</p>
                    <p>Your <strong>${PLAN_LABEL[prevPlan] || prevPlan}</strong> plan refund of <strong>₹${pr.amount}</strong> has been initiated.</p>
                    <div style="background:#fef2f2;border:1px solid #fecdd3;border-radius:12px;padding:16px;margin:20px 0">
                        <div style="margin-bottom:10px"><span style="color:#94a3b8;font-size:12px;font-weight:600">REFUND ID</span><br/><code style="font-size:13px;color:#dc2626">${refund.id}</code></div>
                        <div style="margin-bottom:10px"><span style="color:#94a3b8;font-size:12px;font-weight:600">AMOUNT</span><br/><strong style="color:#dc2626;font-size:16px">₹${pr.amount}</strong></div>
                        <div><span style="color:#94a3b8;font-size:12px;font-weight:600">STATUS</span><br/><span style="color:#16a34a;font-weight:700">✅ Initiated</span></div>
                    </div>
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:20px 0">
                        <p style="margin:0 0 10px;font-weight:700;color:#92400e">⏱ Refund will credit in:</p>
                        <table style="width:100%;font-size:13px;color:#475569;border-collapse:collapse">
                            <tr style="border-bottom:1px solid #fde68a"><td style="padding:6px 0">💳 Credit/Debit Card</td><td style="text-align:right;font-weight:600">5–7 business days</td></tr>
                            <tr style="border-bottom:1px solid #fde68a"><td style="padding:6px 0">📱 UPI (GPay, PhonePe)</td><td style="text-align:right;font-weight:600">2–3 business days</td></tr>
                            <tr style="border-bottom:1px solid #fde68a"><td style="padding:6px 0">🏦 Net Banking</td><td style="text-align:right;font-weight:600">3–5 business days</td></tr>
                            <tr><td style="padding:6px 0">👛 Wallet</td><td style="text-align:right;font-weight:600">1–2 business days</td></tr>
                        </table>
                        <p style="margin:10px 0 0;font-size:12px;color:#b45309">Refund will be credited to your original payment method by your bank.</p>
                    </div>
                    <p style="font-size:13px;color:#64748b">Your account has been reverted to <strong>Free Trial</strong>. For any queries, reply to this email.</p>
                    <div style="margin-top:24px;padding:14px;background:#f1f5f9;border-radius:10px;text-align:center;color:#94a3b8;font-size:12px">UptimeForge — © ${new Date().getFullYear()}</div>
                </div>`
            );
        } catch (_) {}

        res.json({ success: true, refundId: refund.id });
    } catch (e) {
        console.error('[Refund] Error:', e?.error?.description || e.message);
        res.status(500).json({ error: e?.error?.description || e.message });
    }
};

// POST /api/payment/webhook  — Razorpay refund webhook
exports.razorpayWebhook = async (req, res) => {
    try {
        // Verify webhook signature
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (secret) {
            const sig = req.headers['x-razorpay-signature'];
            const body = JSON.stringify(req.body);
            const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
            if (sig !== expected) return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = req.body?.event;
        console.log(`[Razorpay Webhook] Event: ${event}`);

        if (event === 'refund.created' || event === 'refund.processed') {
            const paymentId = req.body?.payload?.refund?.entity?.payment_id;
            if (!paymentId) return res.json({ ok: true });

            // Find payment record by razorpay_payment_id
            const pr = await PaymentRequest.findOne({ razorpay_payment_id: paymentId });
            if (!pr) {
                console.log(`[Razorpay Webhook] No payment record for ${paymentId}`);
                return res.json({ ok: true });
            }

            // Revert user plan to free_trial
            const user = await User.findById(pr.userId);
            if (user) {
                const prevPlan = user.plan;
                user.plan = 'free_trial';
                user.planEndsAt = null;
                user.isActive = false;
                await user.save();

                // Update payment record
                pr.status = 'refunded';
                pr.adminNote = `Refund processed via Razorpay webhook. Payment: ${paymentId}`;
                await pr.save();

                console.log(`[Razorpay Webhook] Refund: ${user.email} reverted ${prevPlan} → free_trial`);

                // Send email notification to user
                try {
                    await sendEmail(user.email, 'Your UptimeForge plan has been cancelled',
                        `<div style="font-family:Inter,sans-serif;padding:28px;max-width:500px;margin:0 auto">
                            <h2 style="color:#ef4444">Plan Cancelled</h2>
                            <p>Hi ${user.name},</p>
                            <p>Your <strong>${PLAN_LABEL[prevPlan] || prevPlan}</strong> plan has been cancelled due to a refund.</p>
                            <p>Your account has been reverted to the <strong>Free Trial</strong> plan.</p>
                            <p>If you have any questions, please contact support.</p>
                        </div>`
                    );
                } catch (_) {}
            }
        }

        res.json({ ok: true });
    } catch (e) {
        console.error('[Razorpay Webhook] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
};

// GET /api/payment/my-requests
exports.getMyRequests = async (req, res) => {
    if (req.isAdmin) return res.json([]);
    try {
        const requests = await PaymentRequest.find({ userId: req.userId }).sort('-createdAt').limit(20);
        res.json(requests);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
