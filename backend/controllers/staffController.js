const jwt       = require('jsonwebtoken');
const StaffUser  = require('../models/StaffUser');

// ── Admin: CRUD staff users ──────────────────────────────────────────────────

// GET /api/staff
exports.list = async (req, res) => {
    try {
        const staff = await StaffUser.find().select('-password').sort('-createdAt');
        res.json(staff);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/staff
exports.create = async (req, res) => {
    try {
        const { name, email, password, permissions } = req.body;
        if (!name || !password) return res.status(400).json({ error: 'Name and password required' });
        if (email) {
            const exists = await StaffUser.findOne({ email });
            if (exists) return res.status(400).json({ error: 'Email already exists' });
        }
        const staff = await StaffUser.create({ name, email: email || '', password, permissions: permissions || [] });
        res.json({ ...staff.toObject(), password: undefined });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// PUT /api/staff/:id
exports.update = async (req, res) => {
    try {
        const { name, email, password, permissions, isActive } = req.body;
        const staff = await StaffUser.findById(req.params.id);
        if (!staff) return res.status(404).json({ error: 'Staff not found' });
        if (name)        staff.name        = name;
        if (email)       staff.email       = email;
        if (permissions) staff.permissions = permissions;
        if (isActive !== undefined) staff.isActive = isActive;
        if (password)    staff.password    = password; // pre-save will hash
        await staff.save();
        const obj = staff.toObject();
        delete obj.password;
        res.json(obj);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/staff/:id
exports.remove = async (req, res) => {
    try {
        await StaffUser.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Staff: Auth ──────────────────────────────────────────────────────────────

// POST /api/staff/login
exports.login = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const loginId = username || email;
        if (!loginId || !password) return res.status(400).json({ error: 'Username and password required' });
        // Support login by name (username) or email
        const staff = await StaffUser.findOne({ $or: [{ name: loginId }, { email: loginId }] });
        if (!staff) return res.status(401).json({ error: 'Invalid credentials' });
        if (!staff.isActive) return res.status(403).json({ error: 'Account deactivated. Contact admin.' });
        const ok = await staff.checkPassword(password);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { staffId: staff._id.toString(), role: 'staff' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.cookie('sm_token', token, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({
            id: staff._id, name: staff.name, email: staff.email,
            permissions: staff.permissions, role: 'staff',
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/staff/logout
exports.logout = async (req, res) => {
    res.clearCookie('sm_token');
    res.json({ success: true });
};

// GET /api/staff/me
exports.me = async (req, res) => {
    try {
        const staff = await StaffUser.findById(req.staffId).select('-password');
        if (!staff) return res.status(404).json({ error: 'Not found' });
        res.json({ ...staff.toObject(), role: 'staff' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
