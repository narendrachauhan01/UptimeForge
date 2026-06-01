const router     = require('express').Router();
const auth       = require('../middleware/auth');
const { adminOnly } = require('../middleware/staffAuth');
const ctrl       = require('../controllers/staffController');
const rateLimit  = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Try again after 15 minutes.' },
    standardHeaders: true, legacyHeaders: false,
});

// Public: staff login/logout
router.post('/login',  loginLimiter, ctrl.login);
router.post('/logout', ctrl.logout);

// Staff: get own profile
router.get('/me', auth, ctrl.me);

// Admin only: manage staff users
router.get('/',      auth, adminOnly, ctrl.list);
router.post('/',     auth, adminOnly, ctrl.create);
router.put('/:id',   auth, adminOnly, ctrl.update);
router.delete('/:id',auth, adminOnly, ctrl.remove);

module.exports = router;

/**
 * @swagger
 * /api/staff/login:
 *   post:
 *     tags: [Staff]
 *     summary: Staff login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:    { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login OK, sm_token cookie set
 * /api/staff/me:
 *   get:
 *     tags: [Staff]
 *     summary: Get current staff profile with permissions
 *     security:
 *       - cookieAuth: []
 * /api/staff:
 *   get:
 *     tags: [Staff]
 *     summary: List all staff users (admin only)
 *     security:
 *       - cookieAuth: []
 *   post:
 *     tags: [Staff]
 *     summary: Create staff user (admin only)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:        { type: string }
 *               email:       { type: string }
 *               password:    { type: string }
 *               permissions: { type: array, items: { type: string }, example: ["users:read","payments:read"] }
 * /api/staff/{id}:
 *   put:
 *     tags: [Staff]
 *     summary: Update staff user permissions (admin only)
 *     security:
 *       - cookieAuth: []
 *   delete:
 *     tags: [Staff]
 *     summary: Delete staff user (admin only)
 *     security:
 *       - cookieAuth: []
 */
