const router = require('express').Router();
const ctrl = require('../controllers/pingController');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.ping);

module.exports = router;
