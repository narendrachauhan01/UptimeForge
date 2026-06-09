const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reportController');
const auth    = require('../middleware/auth');

router.use(auth);

router.get('/',             ctrl.list);
router.post('/generate',    ctrl.generate);
router.put('/schedule',     ctrl.setSchedule);
router.get('/:id/view',     ctrl.view);
router.delete('/:id',       ctrl.remove);

module.exports = router;
