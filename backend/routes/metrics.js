const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/metricsController');

function authAgent(req, res, next) {
    const key = req.headers['x-agent-key'];
    if (!key || key !== process.env.AGENT_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized — invalid agent key' });
    }
    next();
}

router.post('/',                   authAgent, ctrl.ingestMetrics);
router.get('/latest',              auth,      ctrl.getLatest);
router.get('/:serverId/history',   auth,      ctrl.getHistory);

module.exports = router;
