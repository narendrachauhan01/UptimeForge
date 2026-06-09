const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/statusPageController');

function adminOnly(req, res, next) {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
}

router.get('/',                    auth, adminOnly, ctrl.list);
router.post('/',                   auth, adminOnly, ctrl.create);
router.put('/:id',                 auth, adminOnly, ctrl.update);
router.delete('/:id',              auth, adminOnly, ctrl.remove);
router.get('/all-servers',         auth, adminOnly, ctrl.getAllServers);

module.exports = router;
