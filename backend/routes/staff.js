const router     = require('express').Router();
const auth       = require('../middleware/auth');
const { adminOnly } = require('../middleware/staffAuth');
const ctrl       = require('../controllers/staffController');
const rateLimit  = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Try again after 15 minutes.' },
    standardHeaders: true, legacyHeaders: false,
});

// Public: staff login/logout
router.post('/login',  loginLimiter, ctrl.login);
router.post('/logout', ctrl.logout);

// Staff: get own profile
router.get('/me', auth, ctrl.me);

// Admin only: manage staff users
router.get('/',      auth, adminOnly, ctrl.list);
router.post('/',     auth, adminOnly, ctrl.create);
router.put('/:id',   auth, adminOnly, ctrl.update);
router.delete('/:id',auth, adminOnly, ctrl.remove);

module.exports = router;
