const jwt       = require('jsonwebtoken');
const User      = require('../models/User');
const StaffUser = require('../models/StaffUser');

module.exports = async function authMiddleware(req, res, next) {
    const token = req.cookies?.sm_token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.username) {
            // Admin token (existing system)
            req.isAdmin = true;
            return next();
        }

        if (decoded.staffId) {
            const staff = await StaffUser.findById(decoded.staffId);
            if (!staff || !staff.isActive) return res.status(401).json({ error: 'Staff account not found or deactivated' });
            req.isStaff     = true;
            req.staffId     = staff._id;
            req.staffUser   = staff;
            req.staffName   = staff.name;
            req.permissions = staff.permissions;
            return next();
        }

        if (decoded.userId) {
            const user = await User.findById(decoded.userId);
            if (!user) return res.status(401).json({ error: 'User not found' });
            if (user.isBlocked) return res.status(403).json({ error: 'Account blocked. Contact support.', accountStatus: 'suspended' });
            req.user   = user;
            req.userId = user._id;

            const status = user.accountStatus; // 'active' | 'grace' | 'suspended'
            const fullPath = req.originalUrl || (req.baseUrl + req.path);
            // Only payment, support, logout, me allowed after expiry
            const allowedPaths = ['/api/payment', '/api/users/logout', '/api/users/me', '/api/users/support', '/api/users/forgot-password', '/api/users/reset-password', '/api/users/change-password'];
            const isAllowed = allowedPaths.some(p => fullPath.startsWith(p));

            // Grace OR Suspended: block ALL except payment/support/logout/me
            if ((status === 'grace' || status === 'suspended') && !isAllowed) {
                const msg = status === 'suspended'
                    ? 'Account suspended. Please upgrade your plan.'
                    : 'Plan expired. Please upgrade to continue.';
                return res.status(403).json({ error: msg, accountStatus: status, planExpired: true });
            }

            return next();
        }

        return res.status(401).json({ error: 'Invalid token' });
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
