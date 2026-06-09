const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reportController');
const auth    = require('../middleware/auth');

router.get('/:id/view',     ctrl.view);

router.use(auth);

router.get('/:id/pdf',      ctrl.pdf);

router.get('/',             ctrl.list);
router.post('/generate',    ctrl.generate);
router.put('/schedule',     ctrl.setSchedule);
router.delete('/:id',       ctrl.remove);

module.exports = router;
