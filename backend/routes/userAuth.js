const router    = require('express').Router();
const auth      = require('../middleware/auth');
const ctrl      = require('../controllers/userAuthController');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
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

/**
 * @swagger
 * /api/users/config:
 *   get:
 *     tags: [User Auth]
 *     summary: Get public config (Google Client ID, etc.)
 *     responses:
 *       200:
 *         description: Config object
 */
router.get('/config',                ctrl.getConfig);

/**
 * @swagger
 * /api/users/register/send-otp:
 *   post:
 *     tags: [User Auth]
 *     summary: Send OTP to email for registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: user@example.com }
 *               name:  { type: string, example: John Doe }
 */
router.post('/register/send-otp',    ctrl.sendOtp);

/**
 * @swagger
 * /api/users/register/verify-otp:
 *   post:
 *     tags: [User Auth]
 *     summary: Verify OTP and create account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:    { type: string }
 *               otp:      { type: string }
 *               password: { type: string }
 */
router.post('/register/verify-otp',  ctrl.verifyOtp);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: [User Auth]
 *     summary: User login (sets httpOnly cookie)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:    { type: string, example: user@example.com }
 *               password: { type: string, example: "mypassword" }
 *     responses:
 *       200:
 *         description: Login successful, sm_token cookie set
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many attempts
 */
router.post('/login',                loginLimiter, ctrl.login);

/**
 * @swagger
 * /api/users/google-auth:
 *   post:
 *     tags: [User Auth]
 *     summary: Google OAuth login/register
 */
router.post('/google-auth',          ctrl.googleAuth);

/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     tags: [User Auth]
 *     summary: Send password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 */
router.post('/forgot-password',      ctrl.forgotPassword);

/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     tags: [User Auth]
 *     summary: Reset password with token
 */
router.post('/reset-password',       ctrl.resetPassword);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [User Auth]
 *     summary: Get current user profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User object with plan, siteLimit etc.
 */
router.get('/me',                    auth, ctrl.getMe);

router.put('/change-password',       auth, ctrl.changePassword);
router.put('/profile',               auth, ctrl.updateProfile);
router.get('/referral-stats',        auth, ctrl.referralStats);
router.post('/request-delete',       auth, ctrl.requestDelete);
router.get('/confirm-delete',              ctrl.confirmDelete);
router.delete('/me',                 auth, ctrl.deleteMe);

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     tags: [User Auth]
 *     summary: Logout (clears cookie)
 */
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
