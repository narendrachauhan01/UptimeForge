const router = require('express').Router();
const ctrl = require('../controllers/pingController');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.ping);
router.post('/icmp', auth, ctrl.icmpPing);

module.exports = router;
