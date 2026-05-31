const router  = require('express').Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/adminController');
const multer  = require('multer');
const path    = require('path');
const upload  = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/support')),
        filename:    (req, file, cb) => { const ext = file.originalname.split('.').pop(); cb(null, `${Date.now()}${Math.floor(Math.random()*1000)}.${ext}`); },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null,true) : cb(new Error('Images only')),
});

function adminOnly(req, res, next) {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
}

router.get('/users',                auth, adminOnly, ctrl.getUsers);
router.put('/users/:id',            auth, adminOnly, ctrl.updateUser);
router.delete('/users/:id',         auth, adminOnly, ctrl.deleteUser);
router.get('/deleted-users',        auth, adminOnly, ctrl.getDeletedUsers);
router.get('/servers',              auth, adminOnly, ctrl.getServers);
router.get('/settings',             auth, adminOnly, ctrl.getSettings);
router.put('/settings',             auth, adminOnly, ctrl.updateSettings);
router.get('/payments',             auth, adminOnly, ctrl.getPayments);
router.delete('/payments/:id',      auth, adminOnly, ctrl.deletePayment);
router.put('/payments/:id/approve', auth, adminOnly, ctrl.approvePayment);
router.put('/payments/:id/reject',  auth, adminOnly, ctrl.rejectPayment);
router.post('/clear-cache',         auth, adminOnly, ctrl.clearCache);

// Support tickets — admin
router.get('/support-tickets/unread',       auth, adminOnly, async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    const tickets = await SupportTicket.find({ adminUnread: true }).sort('-updatedAt').limit(10).select('name subject priority updatedAt');
    res.json({ count: tickets.length, tickets });
});
router.get('/support-tickets',              auth, adminOnly, async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    res.json(await SupportTicket.find().sort('-createdAt'));
});
router.put('/support-tickets/:id',          auth, adminOnly, async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    const { status, priority } = req.body;
    const t = await SupportTicket.findByIdAndUpdate(req.params.id, { status, priority, adminUnread: false }, { new: true });
    res.json(t);
});
router.post('/support-tickets/:id/mark-read', auth, adminOnly, async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    await SupportTicket.findByIdAndUpdate(req.params.id, { adminUnread: false });
    res.json({ ok: true });
});
router.post('/support-tickets/:id/reply',   auth, adminOnly, upload.array('images',5), async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    const t = await SupportTicket.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const images = (req.files||[]).map(f => `/uploads/support/${f.filename}`);
    t.replies.push({ from: 'admin', message: req.body.message, images });
    if (t.status === 'open') t.status = 'in_progress';
    t.adminUnread = false; // admin replied = seen
    t.userUnread  = true;  // notify user of new reply
    await t.save();
    res.json(t);
});
router.delete('/support-tickets/:id',       auth, adminOnly, async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    await SupportTicket.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

module.exports = router;
