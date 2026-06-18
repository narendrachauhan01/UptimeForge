const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/dnsTargetController');

router.use(auth);

router.get('/',     ctrl.getTargets);
router.post('/',    ctrl.createTarget);
router.put('/:id',  ctrl.updateTarget);
router.delete('/:id', ctrl.deleteTarget);

module.exports = router;

/**
 * @swagger
 * /api/dns-targets:
 *   get:
 *     tags: [DNS Monitoring]
 *     summary: Get all DNS monitor targets
 *     security:
 *       - cookieAuth: []
 *   post:
 *     tags: [DNS Monitoring]
 *     summary: Add DNS target (limit enforced by plan)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: Company Website DNS }
 *               hostname: { type: string, example: example.com }
 *               recordType: { type: string, example: A }
 *               expectedValue: { type: string, example: 203.0.113.10 }
 *               dnsServer: { type: string, example: 8.8.8.8 }
 * /api/dns-targets/{id}:
 *   put:
 *     tags: [DNS Monitoring]
 *     summary: Update DNS target
 *     security:
 *       - cookieAuth: []
 *   delete:
 *     tags: [DNS Monitoring]
 *     summary: Delete DNS target
 *     security:
 *       - cookieAuth: []
 */
