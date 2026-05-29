const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/integrationController');

router.use(auth);

router.get('/',              ctrl.getIntegrations);
router.post('/test-webhook', ctrl.testWebhook);
router.post('/:type',        ctrl.saveIntegration);
router.delete('/:type',      ctrl.deleteIntegration);

module.exports = router;
