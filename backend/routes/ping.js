const router = require('express').Router();
const ctrl = require('../controllers/pingController');

router.post('/', ctrl.ping);

module.exports = router;
