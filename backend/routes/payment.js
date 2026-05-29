const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

router.get('/plans',        ctrl.getPlans);
router.post('/create-order', auth, ctrl.createOrder);
router.post('/verify',       auth, ctrl.verifyPayment);
router.get('/my-requests',   auth, ctrl.getMyRequests);

module.exports = router;
