const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/whatsappController');

function allow(access = 'read') {
    return (req, res, next) => {
        if (req.isAdmin) return next();
        const p = req.permissions || [];
        const hasRead  = p.includes('integrationBackend') || p.includes('integrationBackend:read') || p.includes('integrationBackend:write');
        const hasWrite = p.includes('integrationBackend') || p.includes('integrationBackend:write');
        if (access === 'read'  && hasRead)  return next();
        if (access === 'write' && hasWrite) return next();
        return res.status(403).json({ error: 'Access denied' });
    };
}

router.get('/status',    auth, allow('read'),  ctrl.getStatus);
router.post('/config',   auth, allow('write'), ctrl.saveConfig);
router.post('/test',     auth, allow('write'), ctrl.testSend);
router.delete('/reset',  auth, allow('write'), ctrl.reset);

module.exports = router;
