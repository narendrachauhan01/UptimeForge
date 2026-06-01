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

/**
 * @swagger
 * /api/servers:
 *   get:
 *     tags: [Servers]
 *     summary: Get all servers for current user
 *     security:
 *       - cookieAuth: []
 *   post:
 *     tags: [Servers]
 *     summary: Add a new server to monitor
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: My Website }
 *               url:  { type: string, example: https://example.com }
 * /api/servers/{id}:
 *   put:
 *     tags: [Servers]
 *     summary: Update server
 *     security:
 *       - cookieAuth: []
 *   delete:
 *     tags: [Servers]
 *     summary: Delete server
 *     security:
 *       - cookieAuth: []
 */
