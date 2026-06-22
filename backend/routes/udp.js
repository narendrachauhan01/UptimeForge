const router = require('express').Router();
const ctrl = require('../controllers/udpController');
const auth = require('../middleware/auth');

router.post('/probe', auth, ctrl.probe);

module.exports = router;
