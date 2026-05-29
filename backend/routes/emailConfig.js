const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/emailConfigController');

function adminOnly(req, res, next) {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
}

router.use(auth);
router.use(adminOnly);

router.get('/status',   ctrl.getStatus);
router.put('/update',   ctrl.update);
router.post('/test',    ctrl.test);
router.delete('/reset', ctrl.reset);

module.exports = router;
