const router     = require('express').Router();
const jwt        = require('jsonwebtoken');
const rateLimit  = require('express-rate-limit');
const ctrl       = require('../controllers/authController');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many login attempts. Try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

function adminAuthMiddleware(req, res, next) {
    const token = req.cookies?.sm_token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.username) return res.status(403).json({ error: 'Admin only' });
        next();
    } catch { res.status(401).json({ error: 'Invalid token' }); }
}

router.post('/login',           loginLimiter, ctrl.login);
router.get('/verify',           ctrl.verify);
router.post('/logout',          ctrl.logout);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);
router.get('/profile',          adminAuthMiddleware, ctrl.getProfile);
router.put('/profile',          adminAuthMiddleware, ctrl.updateProfile);

module.exports = router;
