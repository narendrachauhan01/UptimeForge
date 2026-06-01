const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/emailConfigController');

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

router.use(auth);

router.get('/status',   allow('read'),  ctrl.getStatus);
router.put('/update',   allow('write'), ctrl.update);
router.post('/test',    allow('write'), ctrl.test);
router.delete('/reset', allow('write'), ctrl.reset);

module.exports = router;
