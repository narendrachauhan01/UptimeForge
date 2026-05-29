const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/recipientController');

router.use(auth);

router.get('/',     ctrl.getRecipients);
router.post('/',    ctrl.createRecipient);
router.put('/:id',  ctrl.updateRecipient);
router.delete('/:id', ctrl.deleteRecipient);

module.exports = router;
