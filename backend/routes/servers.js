const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/serverController');

router.get('/',              auth, ctrl.getServers);
router.post('/',             auth, ctrl.createServer);
router.post('/check-now',    auth, ctrl.checkNow);
router.get('/:id',           auth, ctrl.getServer);
router.put('/:id',           auth, ctrl.updateServer);
router.delete('/:id',        auth, ctrl.deleteServer);
router.get('/:id/history',   auth, ctrl.getHistory);

module.exports = router;
