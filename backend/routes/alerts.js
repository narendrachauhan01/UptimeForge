const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/alertController');

router.get('/', auth, ctrl.getAlerts);

module.exports = router;
