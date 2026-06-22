const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/udpTargetController');

router.use(auth);

router.get('/',     ctrl.getTargets);
router.post('/',    ctrl.createTarget);
router.put('/:id',  ctrl.updateTarget);
router.delete('/:id', ctrl.deleteTarget);

module.exports = router;

/**
 * @swagger
 * /api/udp-targets:
 *   get:
 *     tags: [UDP Monitoring]
 *     summary: Get all UDP monitor targets
 *     security:
 *       - cookieAuth: []
 *   post:
 *     tags: [UDP Monitoring]
 *     summary: Add UDP target (limit enforced by plan)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: Internal DNS Server }
 *               host: { type: string, example: 192.168.1.1 }
 *               port: { type: number, example: 53 }
 * /api/udp-targets/{id}:
 *   put:
 *     tags: [UDP Monitoring]
 *     summary: Update UDP target
 *     security:
 *       - cookieAuth: []
 *   delete:
 *     tags: [UDP Monitoring]
 *     summary: Delete UDP target
 *     security:
 *       - cookieAuth: []
 */
