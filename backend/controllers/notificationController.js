const Notification = require('../models/Notification');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
    try {
        if (req.isAdmin) return res.json([]);
        const notifs = await Notification.find({ userId: req.userId }).sort('-createdAt').limit(50);
        res.json(notifs);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// PUT /api/notifications/read
exports.markRead = async (req, res) => {
    try {
        if (!req.isAdmin) {
            await Notification.updateMany({ userId: req.userId, read: false }, { $set: { read: true } });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
