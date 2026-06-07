const router = require('express').Router();
const ctrl = require('../controllers/telegramController');

// Public — Telegram calls this directly, no user session
router.post('/webhook', ctrl.webhook);

module.exports = router;
