const router = require('express').Router();
const auth   = require('../middleware/auth');
const User   = require('../models/User');
const ctrl   = require('../controllers/metricsController');

// Per-user agent key auth middleware
async function authAgent(req, res, next) {
    const key = req.headers['x-agent-key'];
    if (!key) return res.status(401).json({ error: 'Missing x-agent-key header' });
    const user = await User.findOne({ agentKey: key }).lean();
    if (!user) return res.status(401).json({ error: 'Invalid agent key' });
    if (user.isBlocked) return res.status(403).json({ error: 'Account blocked' });
    req.agentUser = user;
    next();
}

router.post('/',                    authAgent, ctrl.ingestMetrics);
router.get('/latest',               auth,      ctrl.getLatest);
router.get('/:serverId/history',    auth,      ctrl.getHistory);
router.delete('/:serverId',         auth,      ctrl.deleteServer);

module.exports = router;
