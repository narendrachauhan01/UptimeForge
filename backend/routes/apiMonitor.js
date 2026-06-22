const router = require('express').Router();
const ctrl = require('../controllers/apiMonitorController');
const auth = require('../middleware/auth');

router.post('/test', auth, ctrl.test);

module.exports = router;
