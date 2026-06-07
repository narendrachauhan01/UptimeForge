const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/integrationController');
const tg = require('../controllers/telegramController');

router.use(auth);

router.get('/',                ctrl.getIntegrations);
router.post('/test-webhook',   ctrl.testWebhook);
router.post('/telegram/connect',  tg.connect);
router.get('/telegram/status',    tg.status);
router.post('/telegram/test',     tg.test);
router.post('/telegram/settings', tg.updateSettings);
router.post('/:type',          ctrl.saveIntegration);
router.delete('/:type',      ctrl.deleteIntegration);

module.exports = router;
