const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/agentController');

router.get('/key',        auth, ctrl.getKey);
router.post('/regenerate',auth, ctrl.regenerateKey);
router.get('/download',        ctrl.downloadAgent);   // public — serves agent.js
router.get('/install',         ctrl.installScript);   // public — serves bash script

module.exports = router;
