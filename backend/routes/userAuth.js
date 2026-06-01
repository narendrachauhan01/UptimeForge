const router    = require('express').Router();
const auth      = require('../middleware/auth');
const ctrl      = require('../controllers/userAuthController');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Try again after 15 minutes.' },
    standardHeaders: true, legacyHeaders: false,
});
const multer = require('multer');
const path   = require('path');
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/support')),
        filename:    (req, file, cb) => { const ext = file.originalname.split('.').pop(); cb(null, `${Date.now()}${Math.floor(Math.random()*1000)}.${ext}`); },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images allowed'));
    },
});

router.get('/config',                ctrl.getConfig);
router.post('/register/send-otp',    ctrl.sendOtp);
router.post('/register/verify-otp',  ctrl.verifyOtp);
router.post('/login',                loginLimiter, ctrl.login);
router.post('/google-auth',          ctrl.googleAuth);
router.put('/change-password',       auth, ctrl.changePassword);
router.post('/forgot-password',      ctrl.forgotPassword);
router.post('/reset-password',       ctrl.resetPassword);
router.put('/profile',               auth, ctrl.updateProfile);
router.delete('/me',                 auth, ctrl.deleteMe);
router.get('/me',                    auth, ctrl.getMe);
router.post('/logout',               ctrl.logout);
router.post('/support',                           auth, upload.array('images', 5), ctrl.contactSupport);
router.get('/support/my-tickets',                 auth, ctrl.myTickets);
router.post('/support/:id/reply',                 auth, upload.array('images', 5), ctrl.replyTicket);
router.post('/support/:id/mark-read',             auth, ctrl.markTicketRead);
router.post('/support/upload',                    auth, upload.array('images', 5), (req, res) => {
    const files = (req.files||[]).map(f => `/uploads/support/${f.filename}`);
    res.json({ urls: files });
});

module.exports = router;
