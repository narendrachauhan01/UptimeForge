const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/pingTargetController');

router.use(auth);

router.get('/',     ctrl.getTargets);
router.post('/',    ctrl.createTarget);
router.put('/:id',  ctrl.updateTarget);
router.delete('/:id', ctrl.deleteTarget);

module.exports = router;
