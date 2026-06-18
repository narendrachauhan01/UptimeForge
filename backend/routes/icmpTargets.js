const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/icmpTargetController');

router.use(auth);

router.get('/',     ctrl.getTargets);
router.post('/',    ctrl.createTarget);
router.put('/:id',  ctrl.updateTarget);
router.delete('/:id', ctrl.deleteTarget);

module.exports = router;

/**
 * @swagger
 * /api/icmp-targets:
 *   get:
 *     tags: [Ping Monitor]
 *     summary: Get all ICMP ping monitor targets
 *     security:
 *       - cookieAuth: []
 *   post:
 *     tags: [Ping Monitor]
 *     summary: Add ICMP ping target (limit enforced by plan)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: Office Router }
 *               host: { type: string, example: 192.168.1.1 }
 * /api/icmp-targets/{id}:
 *   put:
 *     tags: [Ping Monitor]
 *     summary: Update ICMP ping target
 *     security:
 *       - cookieAuth: []
 *   delete:
 *     tags: [Ping Monitor]
 *     summary: Delete ICMP ping target
 *     security:
 *       - cookieAuth: []
 */
