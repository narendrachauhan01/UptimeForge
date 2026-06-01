const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/pingTargetController');

router.use(auth);

router.get('/',     ctrl.getTargets);
router.post('/',    ctrl.createTarget);
router.put('/:id',  ctrl.updateTarget);
router.delete('/:id', ctrl.deleteTarget);

module.exports = router;

/**
 * @swagger
 * /api/ping-targets:
 *   get:
 *     tags: [Ping Targets]
 *     summary: Get all ping targets
 *     security:
 *       - cookieAuth: []
 *   post:
 *     tags: [Ping Targets]
 *     summary: Add ping target (limit enforced by plan)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: K&B Server }
 *               host: { type: string, example: 192.168.1.1 }
 *               port: { type: number, example: 22 }
 * /api/ping-targets/{id}:
 *   put:
 *     tags: [Ping Targets]
 *     summary: Update ping target
 *     security:
 *       - cookieAuth: []
 *   delete:
 *     tags: [Ping Targets]
 *     summary: Delete ping target
 *     security:
 *       - cookieAuth: []
 */
