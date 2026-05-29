const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

router.get('/plans',          ctrl.getPlans);
router.post('/create-order',  auth, ctrl.createOrder);
router.post('/verify',        auth, ctrl.verifyPayment);
router.get('/my-requests',    auth, ctrl.getMyRequests);
router.post('/:id/refund',    auth, ctrl.refundPayment);
router.get('/webhook',        (req, res) => res.json({ ok: true, service: 'UptimeForge' }));
router.post('/webhook',       ctrl.razorpayWebhook);

module.exports = router;
