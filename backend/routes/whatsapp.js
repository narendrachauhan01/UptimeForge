const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/whatsappController');

function adminOnly(req, res, next) {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
}

router.get('/status',  auth,            ctrl.getStatus);
router.post('/config', auth, adminOnly, ctrl.saveConfig);
router.post('/test',   auth, adminOnly, ctrl.testSend);

module.exports = router;
