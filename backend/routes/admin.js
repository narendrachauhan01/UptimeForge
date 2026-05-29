const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

function adminOnly(req, res, next) {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
}

router.get('/users',                auth, adminOnly, ctrl.getUsers);
router.put('/users/:id',            auth, adminOnly, ctrl.updateUser);
router.delete('/users/:id',         auth, adminOnly, ctrl.deleteUser);
router.get('/servers',              auth, adminOnly, ctrl.getServers);
router.get('/settings',             auth, adminOnly, ctrl.getSettings);
router.put('/settings',             auth, adminOnly, ctrl.updateSettings);
router.get('/payments',             auth, adminOnly, ctrl.getPayments);
router.delete('/payments/:id',      auth, adminOnly, ctrl.deletePayment);
router.put('/payments/:id/approve', auth, adminOnly, ctrl.approvePayment);
router.put('/payments/:id/reject',  auth, adminOnly, ctrl.rejectPayment);
router.post('/clear-cache',         auth, adminOnly, ctrl.clearCache);

module.exports = router;
