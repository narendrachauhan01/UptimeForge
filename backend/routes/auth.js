const router = require('express').Router();
const jwt = require('jsonwebtoken');
const ctrl = require('../controllers/authController');

function adminAuthMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.username) return res.status(403).json({ error: 'Admin only' });
        next();
    } catch { res.status(401).json({ error: 'Invalid token' }); }
}

router.post('/login',           ctrl.login);
router.get('/verify',           ctrl.verify);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);
router.get('/profile',          adminAuthMiddleware, ctrl.getProfile);
router.put('/profile',          adminAuthMiddleware, ctrl.updateProfile);

module.exports = router;
