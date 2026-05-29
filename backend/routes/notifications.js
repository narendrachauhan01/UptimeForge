const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.use(auth);

router.get('/',     ctrl.getNotifications);
router.put('/read', ctrl.markRead);

module.exports = router;
