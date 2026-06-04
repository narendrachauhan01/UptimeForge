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

// Check if staff has any of the given sections (read or write)
function hasAny(perms, ...sections) {
    return sections.some(s =>
        perms.includes(s) ||
        perms.includes(`${s}:read`) ||
        perms.includes(`${s}:write`)
    );
}

// Allow admin OR staff with specific permission (read or write)
function allow(section, access = 'read', ...alsoAllow) {
    return (req, res, next) => {
        if (req.isAdmin) return next();
        if (req.isStaff) {
            const perms = req.permissions || [];
            // Check specific section
            const hasOld   = perms.includes(section);
            const hasWrite = perms.includes(`${section}:write`);
            const hasRead  = perms.includes(`${section}:read`);
            if (access === 'write' && (hasWrite || hasOld)) return next();
            if (access === 'read'  && (hasRead || hasWrite || hasOld)) return next();
            // Check additional fallback sections (e.g. dashboard can read users for overview)
            if (alsoAllow.length && hasAny(perms, ...alsoAllow)) return next();
        }
        return res.status(403).json({ error: 'Access denied' });
    };
}

router.get('/users',                auth, allow('users','read','dashboard'),        ctrl.getUsers);
router.put('/users/:id',            auth, allow('users','write'),                   ctrl.updateUser);
router.delete('/users/:id',         auth, adminOnly,                                ctrl.deleteUser);
router.get('/deleted-users',        auth, allow('deletedUsers','read','dashboard'), ctrl.getDeletedUsers);
router.get('/servers',              auth, allow('dashboard','read'),                ctrl.getServers);
router.get('/settings',             auth, allow('planSettings','read','dashboard'), ctrl.getSettings);
router.put('/settings',             auth, allow('planSettings','write'),            ctrl.updateSettings);
router.get('/payments',             auth, allow('payments','read','dashboard'),     ctrl.getPayments);
router.delete('/payments/:id',      auth, adminOnly,                    ctrl.deletePayment);
router.put('/payments/:id/approve', auth, allow('payments','write'),    ctrl.approvePayment);
router.put('/payments/:id/reject',  auth, allow('payments','write'),    ctrl.rejectPayment);
router.post('/clear-cache',         auth, adminOnly,                    ctrl.clearCache);

// Support tickets — admin
router.get('/support-tickets/unread',       auth, allow('supportTickets','read'), async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    const tickets = await SupportTicket.find({ adminUnread: true }).sort('-updatedAt').limit(10).select('name subject priority updatedAt');
    res.json({ count: tickets.length, tickets });
});
router.get('/support-tickets',              auth, allow('supportTickets','read'), async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    const User = require('../models/User');
    const tickets = await SupportTicket.find().sort('-createdAt');
    const filled = await Promise.all(tickets.map(async t => {
        const obj = t.toObject();
        if (!obj.accountId) {
            // Try userId first, then email
            let u = null;
            if (obj.userId) u = await User.findById(obj.userId).select('accountId');
            if (!u && obj.email) u = await User.findOne({ email: obj.email }).select('accountId');
            obj.accountId = u?.accountId || null;
        }
        return obj;
    }));
    res.json(filled);
});
router.put('/support-tickets/:id',            auth, allow('supportTickets','write'), async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    const { status, priority } = req.body;
    const t = await SupportTicket.findByIdAndUpdate(req.params.id, { status, priority, adminUnread: false }, { new: true });
    res.json(t);
});
router.post('/support-tickets/:id/mark-read', auth, allow('supportTickets','read'), async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    await SupportTicket.findByIdAndUpdate(req.params.id, { adminUnread: false });
    res.json({ ok: true });
});
router.post('/support-tickets/:id/reply',     auth, allow('supportTickets','write'), upload.array('images',5), async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    const t = await SupportTicket.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const images = (req.files||[]).map(f => `/uploads/support/${f.filename}`);
    const senderName = req.isAdmin ? (process.env.ADMIN_USERNAME || 'Admin') : (req.staffName || req.user?.name || 'Support Team');
    t.replies.push({ from: 'admin', message: req.body.message, images, senderName });
    if (t.status === 'open') t.status = 'in_progress';
    t.adminUnread = false;
    t.userUnread  = true;
    await t.save();
    res.json(t);
});
router.delete('/support-tickets/:id',         auth, allow('supportTickets','write'), async (req, res) => {
    const SupportTicket = require('../models/SupportTicket');
    await SupportTicket.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

module.exports = router;
