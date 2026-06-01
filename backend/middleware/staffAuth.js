// Middleware: allow only admin OR staff with specific permission
module.exports = function requirePermission(permission) {
    return (req, res, next) => {
        if (req.isAdmin) return next();
        if (req.isStaff && (!permission || req.permissions.includes(permission))) return next();
        return res.status(403).json({ error: 'Access denied — insufficient permissions' });
    };
};

// Middleware: admin only (no staff allowed)
module.exports.adminOnly = (req, res, next) => {
    if (req.isAdmin) return next();
    return res.status(403).json({ error: 'Admin only' });
};
