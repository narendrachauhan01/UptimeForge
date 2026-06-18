const router = require('express').Router();
const ctrl = require('../controllers/dnsController');
const auth = require('../middleware/auth');

router.post('/resolve', auth, ctrl.resolve);

module.exports = router;
