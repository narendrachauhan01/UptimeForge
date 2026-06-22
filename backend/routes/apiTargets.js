const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/apiTargetController');

router.use(auth);

router.get('/',     ctrl.getTargets);
router.post('/',    ctrl.createTarget);
router.put('/:id',  ctrl.updateTarget);
router.delete('/:id', ctrl.deleteTarget);

module.exports = router;

/**
 * @swagger
 * /api/api-targets:
 *   get:
 *     tags: [API Monitoring]
 *     summary: Get all API monitor targets
 *     security:
 *       - cookieAuth: []
 *   post:
 *     tags: [API Monitoring]
 *     summary: Add API target (limit enforced by plan)
 *     security:
 *       - cookieAuth: []
 * /api/api-targets/{id}:
 *   put:
 *     tags: [API Monitoring]
 *     summary: Update API target
 *     security:
 *       - cookieAuth: []
 *   delete:
 *     tags: [API Monitoring]
 *     summary: Delete API target
 *     security:
 *       - cookieAuth: []
 */
