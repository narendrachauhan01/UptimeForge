const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/userAuthController');

router.get('/config',                ctrl.getConfig);
router.post('/register/send-otp',    ctrl.sendOtp);
router.post('/register/verify-otp',  ctrl.verifyOtp);
router.post('/login',                ctrl.login);
router.post('/google-auth',          ctrl.googleAuth);
router.put('/change-password',       auth, ctrl.changePassword);
router.post('/forgot-password',      ctrl.forgotPassword);
router.post('/reset-password',       ctrl.resetPassword);
router.put('/profile',               auth, ctrl.updateProfile);
router.delete('/me',                 auth, ctrl.deleteMe);
router.get('/me',                    auth, ctrl.getMe);
router.post('/logout',               ctrl.logout);
router.post('/support',              ctrl.contactSupport);

module.exports = router;
