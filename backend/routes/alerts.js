const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/alertController');

router.get('/server/:serverId', auth, ctrl.getServerIncident);
router.get('/', auth, ctrl.getAlerts);

module.exports = router;

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: Get incidents/alerts for current user (includes ping alerts)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 */
