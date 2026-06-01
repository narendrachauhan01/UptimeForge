const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

router.get('/plans',          ctrl.getPlans);
router.post('/create-order',  auth, ctrl.createOrder);
router.post('/verify',        auth, ctrl.verifyPayment);
router.get('/my-requests',    auth, ctrl.getMyRequests);
router.post('/:id/refund',         auth, ctrl.refundPayment);
router.get('/:id/refund-status',   auth, ctrl.refundStatus);
router.get('/webhook',        (req, res) => res.json({ ok: true, service: 'UptimeForge' }));
router.post('/webhook',       ctrl.razorpayWebhook);

module.exports = router;

/**
 * @swagger
 * /api/payment/plans:
 *   get:
 *     tags: [Payments]
 *     summary: Get all plan configs, prices, limits
 *     responses:
 *       200:
 *         description: Plans object with freeTrialPingLimit, freeTrialSiteLimit, bronzeAccess etc.
 * /api/payment/create-order:
 *   post:
 *     tags: [Payments]
 *     summary: Create Razorpay order for plan purchase
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan:    { type: string, enum: [verification, bronze, silver, gold] }
 *               billing: { type: string, enum: [monthly, annually] }
 * /api/payment/verify:
 *   post:
 *     tags: [Payments]
 *     summary: Verify Razorpay payment signature and activate plan
 *     security:
 *       - cookieAuth: []
 */
