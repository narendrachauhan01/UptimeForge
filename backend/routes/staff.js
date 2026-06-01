const router     = require('express').Router();
const auth       = require('../middleware/auth');
const { adminOnly } = require('../middleware/staffAuth');
const ctrl       = require('../controllers/staffController');

// Public: staff login/logout
router.post('/login',  ctrl.login);
router.post('/logout', ctrl.logout);

// Staff: get own profile
router.get('/me', auth, ctrl.me);

// Admin only: manage staff users
router.get('/',      auth, adminOnly, ctrl.list);
router.post('/',     auth, adminOnly, ctrl.create);
router.put('/:id',   auth, adminOnly, ctrl.update);
router.delete('/:id',auth, adminOnly, ctrl.remove);

module.exports = router;
